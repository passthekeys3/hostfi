import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapListingToProperty,
  mapReservationToRevenue,
  type GuestyListing,
  type GuestyReservation,
} from '@/lib/integrations/guesty';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Verify webhook authenticity using Guesty's webhook secret
 * Guesty sends signature in X-Guesty-Signature header
 */
function verifyWebhook(request: NextRequest): boolean {
  const secret = process.env.GUESTY_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured, allow all (dev mode)
  
  const signature = request.headers.get('x-guesty-signature');
  if (!signature) return false;
  
  // In production, verify signature
  // Guesty uses HMAC-SHA256
  return true; // TODO: Implement proper HMAC verification
}

/**
 * Guesty Webhook Handler
 * POST /api/integrations/guesty/webhook
 * 
 * Guesty webhook payload format:
 * {
 *   event: "reservation.new" | "reservation.updated" | "reservation.cancelled" | "listing.created" | "listing.updated",
 *   data: { ...entity object... },
 *   accountId: string,
 *   timestamp: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!verifyWebhook(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { event, data, accountId } = body as {
      event: string;
      data: Record<string, unknown>;
      accountId?: string;
    };

    console.info(`Guesty webhook: event=${event} accountId=${accountId}`);

    // Find the HostFi user(s) with this Guesty account connected
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('user_id, credentials, metadata')
      .eq('provider', 'guesty')
      .eq('active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ received: true, note: 'No active connections' });
    }

    // Filter to matching accountId if provided
    const targetConnections = accountId
      ? connections.filter(c => c.metadata?.account_id === accountId || c.credentials?.account_id === accountId)
      : connections;
    
    // Fall back to all connections if no match
    const finalConnections = targetConnections.length > 0 ? targetConnections : connections;

    // Process for each connected user
    for (const conn of finalConnections) {
      const hostfiUserId = conn.user_id;

      // --- RESERVATION EVENTS ---
      if (event.startsWith('reservation.')) {
        const reservation = data as unknown as GuestyReservation;
        const guestyReservationId = reservation._id;

        if (event === 'reservation.new' || event === 'reservation.updated') {
          // Find matching HostFi property by guesty_listing_id
          const { data: prop } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('guesty_listing_id', reservation.listingId)
            .single();

          if (!prop) continue; // Property not tracked in HostFi

          // Check if revenue entry already exists
          const { data: existing } = await supabase
            .from('revenue')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('guesty_reservation_id', guestyReservationId)
            .single();

          const mapped = mapReservationToRevenue(reservation, prop.id);

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
                platform_fee: mapped.platform_fee,
                nights: mapped.nights,
                confirmation_code: mapped.confirmation_code,
              })
              .eq('id', existing.id);
          } else {
            // Create new revenue entry
            const { error } = await supabase
              .from('revenue')
              .insert({ user_id: hostfiUserId, ...mapped });
            if (error) {
              console.error(`Guesty webhook: failed to create reservation ${guestyReservationId}:`, error.message);
            }
          }
        } else if (event === 'reservation.cancelled') {
          // Remove the revenue entry
          await supabase
            .from('revenue')
            .delete()
            .eq('user_id', hostfiUserId)
            .eq('guesty_reservation_id', guestyReservationId);
        }
      }

      // --- LISTING EVENTS ---
      if (event.startsWith('listing.')) {
        const listing = data as unknown as GuestyListing;
        const guestyListingId = listing._id;

        if (event === 'listing.created') {
          // Check if user already has this property
          const { data: existingProp } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('guesty_listing_id', guestyListingId)
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
              const mapped = mapListingToProperty(listing);
              await supabase.from('properties').insert({ user_id: hostfiUserId, ...mapped });
            }
          }
        } else if (event === 'listing.updated') {
          const mapped = mapListingToProperty(listing);
          await supabase
            .from('properties')
            .update({
              name: mapped.name,
              address_line1: mapped.address_line1,
              city: mapped.city,
              state: mapped.state,
              zip: mapped.zip,
              status: mapped.status,
              bedrooms: mapped.bedrooms,
              bathrooms: mapped.bathrooms,
            })
            .eq('user_id', hostfiUserId)
            .eq('guesty_listing_id', guestyListingId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Guesty webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
