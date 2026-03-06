import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapPropertyToHostFi,
  mapReservationToRevenue,
  type LodgifyProperty,
  type LodgifyReservation,
} from '@/lib/integrations/lodgify';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Lodgify Webhook Handler
 * POST /api/integrations/lodgify/webhook
 * 
 * Lodgify sends webhooks for booking and property events.
 * Webhook secret verification via X-Lodgify-Signature header (HMAC SHA256).
 * 
 * Events:
 * - booking_created, booking_updated, booking_cancelled
 * - property_created, property_updated
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    
    // Verify webhook signature if secret is configured
    const secret = process.env.LODGIFY_WEBHOOK_SECRET;
    if (secret) {
      const signature = request.headers.get('x-lodgify-signature') || request.headers.get('x-webhook-signature');
      if (!signature) {
        console.error('Lodgify webhook: missing signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const { createHmac } = await import('crypto');
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      if (expected.length !== signature.length) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
      let mismatch = 0;
      for (let i = 0; i < expected.length; i++) {
        mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
      }
      if (mismatch !== 0) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const event = body.event || body.type || '';
    const data = body.data || body.payload || body;

    // Find all active Lodgify connections
    const { data: connections } = await supabase
      .from('integration_connections')
      .select('user_id, credentials, metadata')
      .eq('provider', 'lodgify')
      .eq('active', true);

    if (!connections || connections.length === 0) {
      return NextResponse.json({ received: true, note: 'No active connections' });
    }

    for (const conn of connections) {
      const hostfiUserId = conn.user_id;

      // --- BOOKING EVENTS ---
      if (event.includes('booking') || event.includes('reservation')) {
        const reservation = data as unknown as LodgifyReservation;
        const lodgifyReservationId = String(reservation.id);

        if (event.includes('created') || event.includes('updated')) {
          const { data: prop } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('lodgify_property_id', String(reservation.property_id))
            .single();

          if (!prop) continue;

          const { data: existing } = await supabase
            .from('revenue')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('lodgify_reservation_id', lodgifyReservationId)
            .single();

          const mapped = mapReservationToRevenue(reservation, prop.id);

          if (existing) {
            await supabase.from('revenue').update({
              amount: mapped.amount,
              check_in: mapped.check_in,
              check_out: mapped.check_out,
              date: mapped.date,
              guest_name: mapped.guest_name,
              platform: mapped.platform,
              platform_fee: mapped.platform_fee,
              nights: mapped.nights,
              confirmation_code: mapped.confirmation_code,
            }).eq('id', existing.id);
          } else {
            await supabase.from('revenue').insert({ user_id: hostfiUserId, ...mapped });
          }
        } else if (event.includes('cancelled')) {
          await supabase.from('revenue').delete()
            .eq('user_id', hostfiUserId)
            .eq('lodgify_reservation_id', lodgifyReservationId);
        }
      }

      // --- PROPERTY EVENTS ---
      if (event.includes('property')) {
        const property = data as unknown as LodgifyProperty;
        const lodgifyPropertyId = String(property.id);

        if (event.includes('created')) {
          const { data: existingProp } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', hostfiUserId)
            .eq('lodgify_property_id', lodgifyPropertyId)
            .single();

          if (!existingProp) {
            const { data: profile } = await supabase
              .from('profiles').select('plan').eq('id', hostfiUserId).single();
            const userPlan = (profile?.plan || 'free') as Plan;
            const limit = PROPERTY_LIMITS[userPlan];
            const { count } = await supabase.from('properties')
              .select('*', { count: 'exact', head: true }).eq('user_id', hostfiUserId);

            if ((count || 0) < limit) {
              const mapped = mapPropertyToHostFi(property);
              await supabase.from('properties').insert({ user_id: hostfiUserId, ...mapped });
            }
          }
        } else if (event.includes('updated')) {
          const mapped = mapPropertyToHostFi(property);
          await supabase.from('properties').update({
            name: mapped.name,
            address_line1: mapped.address_line1,
            city: mapped.city,
            state: mapped.state,
            zip: mapped.zip,
            status: mapped.status,
          }).eq('user_id', hostfiUserId).eq('lodgify_property_id', lodgifyPropertyId);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Lodgify webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
