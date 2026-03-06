import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  getProperties,
  getReservations,
  mapPropertyToHostFi,
  mapReservationToRevenue,
  type LodgifyProperty,
  type LodgifyReservation,
} from '@/lib/integrations/lodgify';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    // Support cron-triggered sync (X-Cron-User-Id header)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const cronUserId = request.headers.get('x-cron-user-id');
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}` && cronUserId;

    let userId: string;
    if (isCronCall) {
      userId = cronUserId!;
    } else {
      const auth = await authenticateRequest();
      if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = auth.userId;
    }

    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const { data: connection } = await supabase.from('integration_connections')
      .select('credentials, active, status')
      .eq('user_id', userId)
      .eq('provider', 'lodgify')
      .single();

    if (!connection?.credentials || (connection.status !== 'connected' && connection.active !== true)) {
      return NextResponse.json({ error: 'Lodgify not connected' }, { status: 400 });
    }

    const { readCredentials } = await import('@/lib/crypto');
    const rawCreds = readCredentials(connection.credentials);
    if (!rawCreds) {
      return NextResponse.json({ error: 'Failed to read Lodgify credentials' }, { status: 500 });
    }
    const { api_key } = rawCreds as { api_key: string };

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single();
    const userPlan = (profile?.plan || 'free') as Plan;
    const propertyLimit = PROPERTY_LIMITS[userPlan];

    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const dryRun = body.dryRun === true;
    const selectedPropertyIds: string[] | null = body.selectedPropertyIds || null;

    const results: {
      listings?: {
        imported: number; updated: number; total: number; skipped: number;
        properties?: { id: string; name: string; address?: string }[];
      };
      reservations?: { imported: number; skipped: number; total: number };
      limitReached?: boolean;
    } = {};

    if (syncType === 'listings' || syncType === 'all') {
      let allProperties: LodgifyProperty[] = [];
      let page = 1;
      const size = 50;

      while (true) {
        const { properties } = await getProperties(api_key, { page, size });
        allProperties = allProperties.concat(properties);
        if (properties.length < size) break;
        page++;
      }

      // Dry run: return property list for selection UI
      if (dryRun) {
        results.listings = {
          imported: 0, updated: 0, total: allProperties.length, skipped: 0,
          properties: allProperties.map(p => {
            const addr = p.address || {};
            return {
              id: String(p.id),
              name: p.name || 'Unnamed Property',
              address: [addr.street || p.street, addr.city || p.city, addr.state || p.state].filter(Boolean).join(', ') || undefined,
            };
          }),
        };
        return NextResponse.json({ success: true, results });
      }

      const propertiesToSync = selectedPropertyIds
        ? allProperties.filter(p => selectedPropertyIds.includes(String(p.id)))
        : allProperties;

      const { data: existingProps } = await supabase.from('properties')
        .select('id, lodgify_property_id').eq('user_id', userId).not('lodgify_property_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.lodgify_property_id, p.id]));

      const { count: currentPropertyCount } = await supabase.from('properties')
        .select('*', { count: 'exact', head: true }).eq('user_id', userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0, updated = 0, skippedDueToLimit = 0;

      for (const property of propertiesToSync) {
        const mapped = mapPropertyToHostFi(property);
        const existingId = existingMap.get(String(property.id));
        if (existingId) {
          await supabase.from('properties').update({
            name: mapped.name,
            address_line1: mapped.address_line1,
            city: mapped.city,
            state: mapped.state,
            zip: mapped.zip,
            status: mapped.status,
          }).eq('id', existingId);
          updated++;
        } else {
          if (currentCount >= propertyLimit) { skippedDueToLimit++; continue; }
          const { error } = await supabase.from('properties').insert({ user_id: userId, ...mapped });
          if (!error) { imported++; currentCount++; }
        }
      }
      results.listings = { imported, updated, total: propertiesToSync.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) results.limitReached = true;
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties')
        .select('id, lodgify_property_id').eq('user_id', userId).not('lodgify_property_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.lodgify_property_id, p.id]));

      const relevantPropertyIds = selectedPropertyIds ? new Set(selectedPropertyIds) : null;

      if (propertyMap.size > 0) {
        const { data: existing } = await supabase.from('revenue')
          .select('lodgify_reservation_id').eq('user_id', userId).not('lodgify_reservation_id', 'is', null);
        const existingIds = new Set((existing || []).map(r => r.lodgify_reservation_id));

        let allReservations: LodgifyReservation[] = [];
        let page = 1;
        const size = 50;

        while (true) {
          const { reservations } = await getReservations(api_key, { page, size });
          allReservations = allReservations.concat(reservations);
          if (reservations.length < size) break;
          page++;
        }

        let imported = 0, skipped = 0;
        for (const res of allReservations) {
          if (existingIds.has(String(res.id))) { skipped++; continue; }
          if (relevantPropertyIds && !relevantPropertyIds.has(String(res.property_id))) { skipped++; continue; }
          const propertyId = propertyMap.get(String(res.property_id));
          if (!propertyId) { skipped++; continue; }
          // Skip cancelled reservations
          if (res.status === 'cancelled' || res.status === 'declined') { skipped++; continue; }
          const mapped = mapReservationToRevenue(res, propertyId);
          const { error } = await supabase.from('revenue').insert({ user_id: userId, ...mapped });
          if (!error) imported++; else skipped++;
        }
        results.reservations = { imported, skipped, total: allReservations.length };
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    await supabase.from('integration_connections').update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId).eq('provider', 'lodgify');
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Lodgify sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
