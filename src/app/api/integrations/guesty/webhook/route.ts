import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
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
 * Verify webhook authenticity using Guesty's webhook secret (HMAC SHA256)
 * Guesty sends signature in X-Guesty-Signature header
 */
function verifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GUESTY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('Guesty webhook: GUESTY_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }
  if (!signature) {
    console.error('Guesty webhook: missing X-Guesty-Signature header');
    return false;
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
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
    const rawBody = await request.text();
    const signature = request.headers.get('x-guesty-signature');

    if (!verifyWebhook(rawBody, signature)) {
      console.error('Guesty webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { event, data, accountId, timestamp } = body as {
      event: string;
      data: Record<string, unknown>;
      accountId?: string;
      timestamp?: string;
    };

    // Reject stale webhooks (older than 5 minutes) to prevent replay attacks
    if (timestamp) {
      const webhookTime = new Date(timestamp).getTime();
      if (Number.isFinite(webhookTime) && Math.abs(Date.now() - webhookTime) > 5 * 60 * 1000) {
        console.warn('Guesty webhook: stale timestamp, possible replay attack');
        return NextResponse.json({ error: 'Stale webhook' }, { status: 401 });
      }
    }

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
