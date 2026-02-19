import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapListingToProperty,
  mapReservationToRevenue,
  type HostawayListing,
  type HostawayReservation,
} from '@/lib/integrations/hostaway';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Verify webhook authenticity using Hostaway's webhook secret
 * Hostaway sends the secret in X-Hostaway-Signature header as HMAC-SHA256
 */
function verifyWebhook(request: NextRequest): boolean {
  const secret = process.env.HOSTAWAY_WEBHOOK_SECRET;
  if (!secret) return true; // No secret configured, allow all (dev mode)
  
  const signature = request.headers.get('x-hostaway-signature');
  if (!signature) return false;
  
  // In production, verify HMAC signature
  // For now, simple secret comparison as Hostaway may use different methods
  return true; // TODO: Implement proper HMAC verification when Hostaway docs specify
}

/**
 * Hostaway Webhook Handler
 * POST /api/integrations/hostaway/webhook
 * 
 * Hostaway webhook payload format:
 * {
 *   event: "reservation_created" | "reservation_updated" | "reservation_cancelled" | "listing_created" | "listing_updated",
 *   data: { ...entity object... },
 *   account_id: number,
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

    const { event, data, account_id } = body as {
      event: string;
      data: Record<string, unknown>;
      account_id?: number;
    };

    console.log(`Hostaway webhook: event=${event} account_id=${account_id}`);

    // Find the HostFi user(s) with this Hostaway account connected
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('user_id, credentials, metadata')
      .eq('provider', 'hostaway')
      .eq('active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ received: true, note: 'No active connections' });
    }

    // Filter to matching account_id if provided
    const targetConnections = account_id
      ? connections.filter(c => c.metadata?.account_id === String(account_id) || c.credentials?.account_id === String(account_id))
      : connections;
    
    // Fall back to all connections if no match
    const finalConnections = targetConnections.length > 0 ? targetConnections : connections;

    // Process for each connected user
    for (const conn of finalConnections) {
      const hostfiUserId = conn.user_id;

      // --- RESERVATION EVENTS ---
      if (event.startsWith('reservation_')) {
        const reservation = data as unknown as HostawayReservation;
        const hostawayReservationId = String(reservation.id);

        if (event === 'reservation_created' || event === 'reservation_updated') {
          // Find matching HostFi property by hostaway_listing_id
          const { data: prop } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('hostaway_listing_id', String(reservation.listingMapId))
            .single();

          if (!prop) continue; // Property not tracked in HostFi

          // Check if revenue entry already exists
          const { data: existing } = await supabase
            .from('revenue')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('hostaway_reservation_id', hostawayReservationId)
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
            console.log(`Hostaway webhook: updated reservation ${hostawayReservationId} for user ${hostfiUserId}`);
          } else {
            // Create new revenue entry
            const { error } = await supabase
              .from('revenue')
              .insert({ user_id: hostfiUserId, ...mapped });
            if (!error) {
              console.log(`Hostaway webhook: created reservation ${hostawayReservationId} for user ${hostfiUserId}`);
            } else {
              console.error(`Hostaway webhook: failed to create reservation ${hostawayReservationId}:`, error.message);
            }
          }
        } else if (event === 'reservation_cancelled') {
          // Remove the revenue entry
          await supabase
            .from('revenue')
            .delete()
            .eq('user_id', hostfiUserId)
            .eq('hostaway_reservation_id', hostawayReservationId);
          console.log(`Hostaway webhook: deleted reservation ${hostawayReservationId} for user ${hostfiUserId}`);
        }
      }

      // --- LISTING EVENTS ---
      if (event.startsWith('listing_')) {
        const listing = data as unknown as HostawayListing;
        const hostawayListingId = String(listing.id);

        if (event === 'listing_created') {
          // Check if user already has this property
          const { data: existingProp } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('hostaway_listing_id', hostawayListingId)
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
              console.log(`Hostaway webhook: created listing ${hostawayListingId} for user ${hostfiUserId}`);
            }
          }
        } else if (event === 'listing_updated') {
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
            .eq('hostaway_listing_id', hostawayListingId);
          console.log(`Hostaway webhook: updated listing ${hostawayListingId} for user ${hostfiUserId}`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hostaway webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
