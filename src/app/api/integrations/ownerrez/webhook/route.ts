import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapPropertyToHostFi,
  mapBookingToRevenue,
  type OwnerRezProperty,
  type OwnerRezBooking,
} from '@/lib/integrations/ownerrez';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function verifyAuth(request: NextRequest): boolean {
  const expectedUser = process.env.OWNERREZ_WEBHOOK_USER;
  const expectedPass = process.env.OWNERREZ_WEBHOOK_PASSWORD;
  if (!expectedUser || !expectedPass) return true; // No auth configured, allow all

  const authHeader = request.headers.get('authorization');
  const expected = 'Basic ' + Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64');
  return authHeader === expected;
}

/**
 * OwnerRez Webhook Handler
 * POST /api/integrations/ownerrez/webhook
 * 
 * Payload format:
 * {
 *   id: guid,
 *   user_id: number,
 *   action: "entity_create" | "entity_update" | "entity_delete" | "application_authorization_revoked" | "webhook_test",
 *   entity_type: "booking" | "property" | "guest" | "inquiry" | "quote" | ...,
 *   entity_id: number,
 *   categories: string[],
 *   entity: { ...full entity object... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { action, entity_type, entity_id, entity, user_id } = body as {
      action: string;
      entity_type?: string;
      entity_id?: number;
      entity?: Record<string, unknown>;
      user_id: number;
      categories?: string[];
    };

    console.log(`OwnerRez webhook: action=${action} entity_type=${entity_type} entity_id=${entity_id} user_id=${user_id}`);

    // Find the HostFi user by OwnerRez user_id stored in metadata
    // First try exact match via ownerrez_user_id in metadata
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('user_id, credentials, metadata')
      .eq('provider', 'ownerrez')
      .eq('active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ received: true, note: 'No active connections' });
    }

    // Filter to the specific user if we can match by ownerrez_user_id
    const matchedConnections = user_id
      ? connections.filter(c => c.metadata?.ownerrez_user_id === user_id)
      : [];
    
    // Fall back to all connections if no match (legacy connections without ownerrez_user_id)
    const targetConnections = matchedConnections.length > 0 ? matchedConnections : connections;

    // ========================================================================
    // App revocation
    // ========================================================================
    if (action === 'application_authorization_revoked') {
      // Disconnect all users (or the specific user if we can match)
      for (const conn of targetConnections) {
        await supabase.from('integration_connections')
          .update({ status: 'disconnected', credentials: null, active: false })
          .eq('user_id', conn.user_id)
          .eq('provider', 'ownerrez');
      }
      return NextResponse.json({ received: true });
    }

    // ========================================================================
    // Test webhook
    // ========================================================================
    if (action === 'webhook_test') {
      console.log('OwnerRez webhook test received successfully');
      return NextResponse.json({ received: true, test: true });
    }

    // ========================================================================
    // Entity events — process for each connected user
    // ========================================================================
    for (const conn of targetConnections) {
      const hostfiUserId = conn.user_id;

      // --- BOOKING EVENTS ---
      if (entity_type === 'booking' && entity && entity_id) {
        const booking = entity as unknown as OwnerRezBooking;
        const orBookingId = String(entity_id);

        if (action === 'entity_create' || action === 'entity_update') {
          // Find matching HostFi property
          const { data: prop } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_property_id', String(booking.property_id))
            .single();

          if (!prop) continue; // Property not tracked in HostFi

          // Check if revenue entry already exists
          const { data: existing } = await supabase
            .from('revenue')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_booking_id', orBookingId)
            .single();

          const mapped = mapBookingToRevenue(booking, prop.id);

          if (existing) {
            // Update existing revenue entry
            await supabase
              .from('revenue')
              .update({
                amount: mapped.amount,
                check_in: mapped.check_in,
                check_out: mapped.check_out,
                date: mapped.date,
                guest_name: mapped.guest_name,
                platform: mapped.platform,
                description: mapped.description,
              })
              .eq('id', existing.id);
            console.log(`OwnerRez webhook: updated booking ${orBookingId} for user ${hostfiUserId}`);
          } else {
            // Create new revenue entry
            const { error } = await supabase
              .from('revenue')
              .insert({ user_id: hostfiUserId, ...mapped });
            if (!error) {
              console.log(`OwnerRez webhook: created booking ${orBookingId} for user ${hostfiUserId}`);
            } else {
              console.error(`OwnerRez webhook: failed to create booking ${orBookingId}:`, error.message);
            }
          }
        } else if (action === 'entity_delete') {
          // Remove the revenue entry
          await supabase
            .from('revenue')
            .delete()
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_booking_id', orBookingId);
          console.log(`OwnerRez webhook: deleted booking ${orBookingId} for user ${hostfiUserId}`);
        }
      }

      // --- PROPERTY EVENTS ---
      if (entity_type === 'property' && entity && entity_id) {
        const property = entity as unknown as OwnerRezProperty;
        const orPropertyId = String(entity_id);

        if (action === 'entity_create') {
          // Check if user already has this property
          const { data: existingProp } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_property_id', orPropertyId)
            .single();

          if (!existingProp) {
            // Check plan limit
            const { data: profile } = await supabase
              .from('profiles')
              .select('plan')
              .eq('id', hostfiUserId)
              .single();
            const userPlan = (profile?.plan || 'free') as Plan;
            const limit = PROPERTY_LIMITS[userPlan];
            const { count } = await supabase
              .from('properties')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', hostfiUserId);

            if ((count || 0) < limit) {
              const mapped = mapPropertyToHostFi(property);
              await supabase.from('properties').insert({ user_id: hostfiUserId, ...mapped });
              console.log(`OwnerRez webhook: created property ${orPropertyId} for user ${hostfiUserId}`);
            }
          }
        } else if (action === 'entity_update') {
          const mapped = mapPropertyToHostFi(property);
          await supabase
            .from('properties')
            .update({
              name: mapped.name,
              address_line1: mapped.address_line1,
              city: mapped.city,
              state: mapped.state,
              zip: mapped.zip,
              status: mapped.status,
            })
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_property_id', orPropertyId);
          console.log(`OwnerRez webhook: updated property ${orPropertyId} for user ${hostfiUserId}`);
        } else if (action === 'entity_delete') {
          // Don't auto-delete properties — just mark inactive
          await supabase
            .from('properties')
            .update({ status: 'inactive' })
            .eq('user_id', hostfiUserId)
            .eq('ownerrez_property_id', orPropertyId);
          console.log(`OwnerRez webhook: deactivated property ${orPropertyId} for user ${hostfiUserId}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('OwnerRez webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
