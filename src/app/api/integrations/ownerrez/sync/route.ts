import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  getProperties,
  getBookings,
  mapPropertyToHostFi,
  mapBookingToRevenue,
  authFromCredentials,
  type OwnerRezProperty,
  type OwnerRezBooking,
} from '@/lib/integrations/ownerrez';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    // Try both status='connected' and active=true for backwards compatibility
    const { data: connection } = await supabase.from('integration_connections')
      .select('credentials, active, status')
      .eq('user_id', session.userId)
      .eq('provider', 'ownerrez')
      .single();

    if (!connection?.credentials || (connection.status !== 'connected' && connection.active !== true)) {
      return NextResponse.json({ error: 'OwnerRez not connected' }, { status: 400 });
    }

    const { readCredentials } = await import('@/lib/crypto');
    const auth = authFromCredentials(readCredentials(connection.credentials));

    // Get user's plan for property limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.userId)
      .single();
    
    const userPlan = (profile?.plan || 'free') as Plan;
    const propertyLimit = PROPERTY_LIMITS[userPlan];

    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const dryRun = body.dryRun === true;
    const selectedPropertyIds: string[] | null = body.selectedPropertyIds || null;

    const results: {
      listings?: {
        imported: number;
        updated: number;
        total: number;
        skipped: number;
        properties?: { id: string; name: string; address?: string }[];
      };
      reservations?: { imported: number; skipped: number; total: number; skipReasons?: Record<string, number> };
      limitReached?: boolean;
    } = {};

    if (syncType === 'listings' || syncType === 'all') {
      // Paginate through all properties
      let allProperties: OwnerRezProperty[] = [];
      let page = 1;
      const pageSize = 50;

      while (true) {
        const result = await getProperties(auth, { page, page_size: pageSize });
        allProperties = allProperties.concat(result.items);
        if (!result.has_more || result.items.length < pageSize) break;
        page++;
      }

      // Dry run: just return the property list for selection UI
      if (dryRun) {
        results.listings = {
          imported: 0, updated: 0, total: allProperties.length, skipped: 0,
          properties: allProperties.map(p => ({
            id: String(p.id),
            name: p.name || 'Unnamed Property',
            address: [p.address?.street1, p.address?.city, p.address?.state].filter(Boolean).join(', ') || undefined,
          })),
        };
        return NextResponse.json({ success: true, results });
      }

      // Filter to selected properties if provided
      const propertiesToSync = selectedPropertyIds
        ? allProperties.filter(p => selectedPropertyIds.includes(String(p.id)))
        : allProperties;

      const { data: existingProps } = await supabase.from('properties')
        .select('id, ownerrez_property_id').eq('user_id', session.userId).not('ownerrez_property_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.ownerrez_property_id, p.id]));

      const { count: currentPropertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0, updated = 0, skippedDueToLimit = 0;

      for (const prop of propertiesToSync) {
        const mapped = mapPropertyToHostFi(prop);
        const existingId = existingMap.get(String(prop.id));
        if (existingId) {
          await supabase.from('properties').update({ name: mapped.name, address_line1: mapped.address_line1, city: mapped.city, state: mapped.state, zip: mapped.zip, status: mapped.status }).eq('id', existingId);
          updated++;
        } else {
          if (currentCount >= propertyLimit) {
            skippedDueToLimit++;
            continue;
          }
          const { error } = await supabase.from('properties').insert({ user_id: session.userId, ...mapped });
          if (!error) {
            imported++;
            currentCount++;
          } else {
            console.error('OwnerRez import error:', error.message);
          }
        }
      }
      results.listings = { imported, updated, total: propertiesToSync.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) {
        results.limitReached = true;
      }
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties').select('id, ownerrez_property_id').eq('user_id', session.userId).not('ownerrez_property_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.ownerrez_property_id, p.id]));

      // If selectedPropertyIds provided, only sync reservations for selected properties
      const relevantPropertyIds = selectedPropertyIds
        ? new Set(selectedPropertyIds)
        : null;

      if (propertyMap.size > 0) {
        const { data: existing } = await supabase.from('revenue').select('ownerrez_booking_id').eq('user_id', session.userId).not('ownerrez_booking_id', 'is', null);
        const existingIds = new Set((existing || []).map(r => r.ownerrez_booking_id));

        let allBookings: OwnerRezBooking[] = [];
        let page = 1;
        const pageSize = 50;

        while (true) {
          const result = await getBookings(auth, { page, page_size: pageSize });
          allBookings = allBookings.concat(result.items);
          if (!result.has_more || result.items.length < pageSize) break;
          page++;
        }

        let imported = 0, skipped = 0;
        const skipReasons: Record<string, number> = {};
        for (const booking of allBookings) {
          if (existingIds.has(String(booking.id))) { skipped++; skipReasons['already_exists'] = (skipReasons['already_exists'] || 0) + 1; continue; }
          if (relevantPropertyIds && !relevantPropertyIds.has(String(booking.property_id))) { skipped++; skipReasons['not_selected'] = (skipReasons['not_selected'] || 0) + 1; continue; }
          const propertyId = propertyMap.get(String(booking.property_id));
          if (!propertyId) {
            skipped++;
            skipReasons['no_matching_property'] = (skipReasons['no_matching_property'] || 0) + 1;
            console.log(`OwnerRez sync: booking ${booking.id} skipped — property_id ${booking.property_id} not found in HostFi. Known property IDs: [${Array.from(propertyMap.keys()).join(', ')}]`);
            continue;
          }
          const mapped = mapBookingToRevenue(booking, propertyId);
          const { error } = await supabase.from('revenue').insert({ user_id: session.userId, ...mapped });
          if (!error) imported++;
          else { skipped++; skipReasons['db_error'] = (skipReasons['db_error'] || 0) + 1; skipReasons['db_detail'] = error.message as unknown as number; console.error('Booking insert error:', error.message, 'Data:', JSON.stringify(mapped)); }
        }
        results.reservations = { imported, skipped, total: allBookings.length, skipReasons } as typeof results.reservations;
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    await supabase.from('integration_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', session.userId).eq('provider', 'ownerrez');
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('OwnerRez sync error:', message);
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
