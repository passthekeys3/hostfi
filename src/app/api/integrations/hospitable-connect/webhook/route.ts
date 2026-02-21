/**
 * POST /api/integrations/hospitable-connect/webhook - Webhook handler
 *
 * Handles Hospitable Connect webhook events:
 * - property.created / property.updated / property.deleted
 * - reservation.created / reservation.updated / reservation.cancelled
 * - connection.activated / connection.deactivated
 *
 * Verifies HMAC signature using HOSPITABLE_CONNECT_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = SupabaseClient<any>;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Verify HMAC-SHA256 signature from Hospitable Connect
 */
function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.HOSPITABLE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    // In production, reject unsigned webhooks
    return process.env.NODE_ENV !== 'production';
  }
  if (!signatureHeader) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Support both raw hex and "sha256=hex" formats
  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7)
    : signatureHeader;

  if (provided.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(provided),
    Buffer.from(expected)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature
    const signature = request.headers.get('x-hospitable-signature')
      || request.headers.get('x-webhook-signature')
      || request.headers.get('x-signature');

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body.event || body.type || body.action || 'unknown';
    const data = body.data || body.payload || body;

    console.info('Hospitable Connect webhook:', JSON.stringify({
      event: eventType,
      customerId: body.customer_id || data.customer_id,
      timestamp: new Date().toISOString(),
    }));

    const supabase = getServiceClient();
    if (!supabase) {
      console.error('Hospitable Connect webhook: Supabase not configured');
      return NextResponse.json({ received: true });
    }

    // Route by event type
    if (eventType.startsWith('property.') || eventType.startsWith('listing.')) {
      await handlePropertyEvent(supabase, eventType, data);
    } else if (eventType.startsWith('reservation.') || eventType.startsWith('booking.')) {
      await handleReservationEvent(supabase, eventType, data);
    } else if (eventType.startsWith('connection.') || eventType.startsWith('channel.')) {
      await handleConnectionEvent(supabase, eventType, data, body);
    } else {
      // Log unhandled event types for future implementation
      console.info('Hospitable Connect webhook: unhandled event type:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hospitable Connect webhook error:', error);
    // Always return 200 to prevent retries
    return NextResponse.json({ received: true });
  }
}

/**
 * Handle property events — sync property data
 */
async function handlePropertyEvent(
  supabase: Supabase,
  eventType: string,
  data: Record<string, unknown>
) {
  const propertyId = data.id || data.property_id || data.listing_id;
  const customerId = data.customer_id || data.user_id;

  if (!propertyId || !customerId) {
    console.warn('Hospitable Connect property event missing required fields:', { eventType, data });
    return;
  }

  // Find the user by their Hospitable Connect customer ID
  const { data: connection } = await supabase
    .from('integration_connections')
    .select('user_id')
    .eq('provider', 'hospitable_connect')
    .eq('active', true)
    .filter('metadata->>customer_id', 'eq', String(customerId))
    .single();

  if (!connection) {
    console.warn('No Hospitable Connect connection for customer:', customerId);
    return;
  }

  if (eventType.includes('deleted') || eventType.includes('removed')) {
    // Mark property as inactive rather than deleting
    await supabase
      .from('properties')
      .update({ active: false })
      .eq('user_id', connection.user_id)
      .eq('hospitable_property_id', String(propertyId));
  } else {
    // Upsert property data
    const name = (data.name || data.title || data.nickname || 'Unnamed Property') as string;
    const address = (data.address || data.location || '') as string;

    await supabase
      .from('properties')
      .upsert({
        user_id: connection.user_id,
        hospitable_property_id: String(propertyId),
        name,
        address,
        source: 'hospitable_connect',
        active: true,
      }, { onConflict: 'user_id,hospitable_property_id', ignoreDuplicates: false });
  }
}

/**
 * Handle reservation events — sync booking/revenue data
 */
async function handleReservationEvent(
  supabase: Supabase,
  eventType: string,
  data: Record<string, unknown>
) {
  const reservationId = data.id || data.reservation_id || data.booking_id;
  const customerId = data.customer_id || data.user_id;
  const propertyId = data.property_id || data.listing_id;

  if (!reservationId || !customerId) {
    console.warn('Hospitable Connect reservation event missing required fields:', { eventType, data });
    return;
  }

  const { data: connection } = await supabase
    .from('integration_connections')
    .select('user_id')
    .eq('provider', 'hospitable_connect')
    .eq('active', true)
    .filter('metadata->>customer_id', 'eq', String(customerId))
    .single();

  if (!connection) {
    console.warn('No Hospitable Connect connection for customer:', customerId);
    return;
  }

  if (eventType.includes('cancelled') || eventType.includes('canceled') || eventType.includes('deleted')) {
    // Mark reservation revenue as cancelled
    await supabase
      .from('revenue')
      .update({ status: 'cancelled' })
      .eq('user_id', connection.user_id)
      .eq('booking_id', String(reservationId));
  } else {
    // Look up property
    let dbPropertyId: string | null = null;
    if (propertyId) {
      const { data: prop } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', connection.user_id)
        .eq('hospitable_property_id', String(propertyId))
        .single();
      dbPropertyId = prop?.id || null;
    }

    const amount = Number(data.total || data.amount || data.payout || 0);
    const guestName = (data.guest_name || data.guest || '') as string;
    const checkIn = (data.check_in || data.checkin || data.start_date || '') as string;
    const checkOut = (data.check_out || data.checkout || data.end_date || '') as string;
    const platform = (data.platform || data.channel || data.source || 'hospitable_connect') as string;

    await supabase
      .from('revenue')
      .upsert({
        user_id: connection.user_id,
        property_id: dbPropertyId,
        booking_id: String(reservationId),
        amount,
        guest_name: guestName,
        check_in: checkIn || null,
        check_out: checkOut || null,
        platform,
        source: 'hospitable_connect',
        date: checkIn || new Date().toISOString().split('T')[0],
        status: eventType.includes('confirmed') ? 'confirmed' : 'pending',
      }, { onConflict: 'user_id,booking_id', ignoreDuplicates: false });
  }
}

/**
 * Handle connection status events
 */
async function handleConnectionEvent(
  supabase: Supabase,
  eventType: string,
  data: Record<string, unknown>,
  body: Record<string, unknown>
) {
  const customerId = data.customer_id || body.customer_id;
  if (!customerId) {
    console.warn('Hospitable Connect connection event missing customer_id');
    return;
  }

  const isDeactivated = eventType.includes('deactivated') || eventType.includes('disconnected');

  await supabase
    .from('integration_connections')
    .update({
      active: !isDeactivated,
      status: isDeactivated ? 'disconnected' : 'connected',
    })
    .eq('provider', 'hospitable_connect')
    .filter('metadata->>customer_id', 'eq', String(customerId));

  console.info(`Hospitable Connect: customer ${customerId} ${isDeactivated ? 'disconnected' : 'connected'}`);
}

// Also handle GET for webhook verification if needed
export async function GET() {
  return NextResponse.json({ status: 'ok', integration: 'hospitable_connect' });
}
