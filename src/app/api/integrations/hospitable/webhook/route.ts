import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import {
  mapPropertyToHostFi,
  mapReservationToRevenue,
  extractExpensesFromReservation,
  isOwnerStay,
  fetchReservation,
  authFromCredentials,
  getAccessToken,
  type HospitableProperty,
  type HospitableReservation,
} from '@/lib/integrations/hospitable';
import { decryptCredentials } from '@/lib/crypto';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Verify Hospitable webhook signature (HMAC SHA256)
 * Header: Signature
 * Secret: from Partner Portal (env HOSPITABLE_WEBHOOK_SECRET)
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.HOSPITABLE_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification (log warning)
    console.warn('Hospitable webhook: HOSPITABLE_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }
  if (!signature) {
    console.error('Hospitable webhook: missing Signature header');
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
 * Hospitable Webhook Handler
 * POST /api/integrations/hospitable/webhook
 * 
 * Webhook payload format:
 * {
 *   id: string,
 *   data: { ...entity data... },
 *   action: "reservation.created" | "reservation.changed" | "property.created" | etc,
 *   created: datetime,
 *   version: "v2",
 *   triggers?: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification, then parse
    const rawBody = await request.text();
    const signature = request.headers.get('signature');

    if (!verifySignature(rawBody, signature)) {
      console.error('Hospitable webhook: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { action, data } = body as {
      id?: string;
      action: string;
      data: Record<string, unknown>;
      created?: string;
      version?: string;
      triggers?: string[];
    };

    console.info(`Hospitable webhook: action=${action}`);

    // ========================================================================
    // Integration Disconnected
    // ========================================================================
    if (action === 'integration.disconnected') {
      const hospUserId = data.user as string | undefined;
      
      if (hospUserId) {
        // Find the connection that has this Hospitable user ID in metadata
        const { data: connections } = await supabase
          .from('integration_connections')
          .select('user_id, metadata')
          .eq('provider', 'hospitable')
          .eq('status', 'connected');
        
        // Try to match by stored hospitable_user_id in metadata
        const match = connections?.find(c => c.metadata?.hospitable_user_id === hospUserId);
        
        if (match) {
          await supabase
            .from('integration_connections')
            .update({ status: 'disconnected', credentials: null, active: false })
            .eq('user_id', match.user_id)
            .eq('provider', 'hospitable');
        }
      }
      
      return NextResponse.json({ received: true });
    }

    // ========================================================================
    // Property Events
    // ========================================================================
    if (action === 'property.created' || action === 'property.changed') {
      const property = data as unknown as HospitableProperty;
      const hospPropertyId = property.id;

      if (!hospPropertyId) {
        return NextResponse.json({ received: true, note: 'No property ID' });
      }

      // Find all users who have synced this property
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id, user_id, hospitable_property_id')
        .eq('hospitable_property_id', hospPropertyId);

      if (existingProps && existingProps.length > 0) {
        const mapped = mapPropertyToHostFi(property);
        
        for (const prop of existingProps) {
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
            .eq('id', prop.id);
        }
      }

      return NextResponse.json({ received: true });
    }

    if (action === 'property.deleted') {
      const hospPropertyId = data.id as string | undefined;

      if (hospPropertyId) {
        // Mark property as inactive (don't delete)
        await supabase
          .from('properties')
          .update({ status: 'inactive' })
          .eq('hospitable_property_id', hospPropertyId);
      }

      return NextResponse.json({ received: true });
    }

    if (action === 'property.merged') {
      const previousId = data.previous_id as string | undefined;
      const newId = data.new_id as string | undefined;

      if (previousId && newId) {
        // Update all properties with the old ID to the new ID
        await supabase
          .from('properties')
          .update({ hospitable_property_id: newId })
          .eq('hospitable_property_id', previousId);
      }

      return NextResponse.json({ received: true });
    }

    // ========================================================================
    // Reservation Events
    // ========================================================================
    if (action === 'reservation.created' || action === 'reservation.changed') {
      let reservation = data as unknown as HospitableReservation & { properties?: Array<{ id: string }> };
      const hospReservationId = reservation.id;
      // property_id may come directly or via the properties include
      let hospPropertyId = reservation.property_id 
        || (reservation.properties && reservation.properties.length > 0 ? reservation.properties[0].id : null);

      if (!hospReservationId) {
        return NextResponse.json({ received: true, note: 'No reservation ID' });
      }

      // If webhook payload lacks financials, fetch the full reservation via API
      if (!reservation.financials && hospPropertyId) {
        try {
          // Find a user with this property to get credentials
          const { data: propOwner } = await supabase
            .from('properties')
            .select('user_id')
            .eq('hospitable_property_id', hospPropertyId)
            .limit(1)
            .single();

          if (propOwner) {
            const { data: conn } = await supabase
              .from('integration_connections')
              .select('credentials')
              .eq('user_id', propOwner.user_id)
              .eq('provider', 'hospitable')
              .eq('status', 'connected')
              .single();

            if (conn?.credentials) {
              const creds = typeof conn.credentials === 'string'
                ? authFromCredentials(decryptCredentials(conn.credentials))
                : authFromCredentials(conn.credentials);
              const { auth: hospAuth } = await getAccessToken(creds);
              const fullRes = await fetchReservation(hospAuth, hospReservationId);
              // Preserve property_id since the single-reservation endpoint may not include it
              fullRes.property_id = fullRes.property_id || hospPropertyId;
              reservation = fullRes as typeof reservation;
              hospPropertyId = reservation.property_id || hospPropertyId;
            }
          }
        } catch (err) {
          console.error(`Hospitable webhook: failed to fetch full reservation ${hospReservationId}:`, err);
          // Continue with whatever data we have
        }
      }

      // Skip owner stays — personal use isn't revenue
      if (isOwnerStay(reservation)) {
        return NextResponse.json({ received: true, note: 'Owner stay skipped' });
      }

      // Find the HostFi property
      const { data: properties } = await supabase
        .from('properties')
        .select('id, user_id')
        .eq('hospitable_property_id', hospPropertyId);

      if (!properties || properties.length === 0) {
        return NextResponse.json({ received: true, note: 'Property not tracked' });
      }

      for (const prop of properties) {
        // Check if revenue entry exists
        const { data: existing } = await supabase
          .from('revenue')
          .select('id')
          .eq('user_id', prop.user_id)
          .eq('hospitable_reservation_id', hospReservationId)
          .single();

        const mapped = mapReservationToRevenue(reservation, prop.id);

        if (existing) {
          await supabase
            .from('revenue')
            .update({
              amount: mapped.amount,
              platform_fee: mapped.platform_fee,
              check_in: mapped.check_in,
              check_out: mapped.check_out,
              date: mapped.date,
              guest_name: mapped.guest_name,
              platform: mapped.platform,
              description: mapped.description,
              nights: mapped.nights,
              confirmation_code: mapped.confirmation_code,
            })
            .eq('id', existing.id);
        } else {
          const { error } = await supabase
            .from('revenue')
            .insert({ user_id: prop.user_id, ...mapped });
          
          if (error) {
            console.error(`Hospitable webhook: failed to create reservation:`, error.message);
          }
        }

        // Extract host-side fees/taxes as expenses (cleaning fees, host taxes)
        const expenses = extractExpensesFromReservation(reservation, prop.id);
        for (const expense of expenses) {
          // Upsert by reservation ID + description to avoid duplicates
          const { data: existingExpense } = await supabase
            .from('expenses')
            .select('id')
            .eq('user_id', prop.user_id)
            .eq('property_id', prop.id)
            .eq('description', expense.description)
            .single();

          if (existingExpense) {
            await supabase
              .from('expenses')
              .update({ amount: expense.amount, date: expense.date, category: expense.category })
              .eq('id', existingExpense.id);
          } else {
            await supabase
              .from('expenses')
              .insert({ user_id: prop.user_id, ...expense });
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    // Unknown action — acknowledge anyway
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hospitable webhook error:', error);
    // Return 200 to prevent retries for malformed payloads
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
