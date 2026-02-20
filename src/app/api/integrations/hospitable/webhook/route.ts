import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  mapPropertyToHostFi,
  mapReservationToRevenue,
  type HospitableProperty,
  type HospitableReservation,
} from '@/lib/integrations/hospitable';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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
    const body = await request.json();
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

    console.log(`Hospitable webhook: action=${action}`);

    // ========================================================================
    // Integration Disconnected
    // ========================================================================
    if (action === 'integration.disconnected') {
      const userId = data.user as string | undefined;
      
      if (userId) {
        // Find connection by user metadata if we stored it, otherwise disconnect all
        // that match. In practice, we may need a different way to identify the user.
        await supabase
          .from('integration_connections')
          .update({ status: 'disconnected', credentials: null, active: false })
          .eq('provider', 'hospitable');
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
          
          console.log(`Hospitable webhook: updated property ${hospPropertyId} for user ${prop.user_id}`);
        }
      } else if (action === 'property.created') {
        // For new properties, we need to find users with Hospitable connections
        // and check if they want auto-import (for now, we skip auto-import)
        console.log(`Hospitable webhook: new property ${hospPropertyId} — skipping auto-import`);
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
        
        console.log(`Hospitable webhook: deactivated property ${hospPropertyId}`);
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
        
        console.log(`Hospitable webhook: merged property ${previousId} -> ${newId}`);
      }

      return NextResponse.json({ received: true });
    }

    // ========================================================================
    // Reservation Events
    // ========================================================================
    if (action === 'reservation.created' || action === 'reservation.changed') {
      const reservation = data as unknown as HospitableReservation;
      const hospReservationId = reservation.id;
      const hospPropertyId = reservation.property_id;

      if (!hospReservationId) {
        return NextResponse.json({ received: true, note: 'No reservation ID' });
      }

      // Find the HostFi property
      const { data: properties } = await supabase
        .from('properties')
        .select('id, user_id')
        .eq('hospitable_property_id', hospPropertyId);

      if (!properties || properties.length === 0) {
        console.log(`Hospitable webhook: reservation ${hospReservationId} — no matching property`);
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
          // Update existing
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
              nights: mapped.nights,
              confirmation_code: mapped.confirmation_code,
            })
            .eq('id', existing.id);
          
          console.log(`Hospitable webhook: updated reservation ${hospReservationId}`);
        } else {
          // Create new
          const { error } = await supabase
            .from('revenue')
            .insert({ user_id: prop.user_id, ...mapped });
          
          if (!error) {
            console.log(`Hospitable webhook: created reservation ${hospReservationId}`);
          } else {
            console.error(`Hospitable webhook: failed to create reservation:`, error.message);
          }
        }
      }

      return NextResponse.json({ received: true });
    }

    // Unknown action — acknowledge anyway
    console.log(`Hospitable webhook: unhandled action ${action}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hospitable webhook error:', error);
    // Return 200 to prevent retries for malformed payloads
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
