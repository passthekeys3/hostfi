import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  getHostawayToken,
  getListings,
  getReservations,
  mapListingToProperty,
  mapReservationToRevenue,
  type HostawayListing,
  type HostawayReservation,
} from '@/lib/integrations/hostaway';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const { data: connection } = await supabase.from('integration_connections')
      .select('credentials').eq('user_id', auth.userId).eq('provider', 'hostaway').eq('status', 'connected').single();

    if (!connection?.credentials) return NextResponse.json({ error: 'Hostaway not connected' }, { status: 400 });

    const { readCredentials } = await import('@/lib/crypto');
    const { account_id, api_key } = readCredentials(connection.credentials) as { account_id: string; api_key: string };
    const token = await getHostawayToken(account_id, api_key);

    // Get user's plan for property limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', auth.userId)
      .single();
    
    const userPlan = (profile?.plan || 'free') as Plan;
    const propertyLimit = PROPERTY_LIMITS[userPlan];

    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const results: {
      listings?: { imported: number; updated: number; total: number; skipped: number };
      reservations?: { imported: number; skipped: number; total: number };
      limitReached?: boolean;
    } = {};

    if (syncType === 'listings' || syncType === 'all') {
      // Paginate through all listings
      let allListings: HostawayListing[] = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const { listings } = await getListings(token, { limit, offset });
        allListings = allListings.concat(listings);
        if (listings.length < limit) break;
        offset += limit;
      }

      const { data: existingProps } = await supabase.from('properties')
        .select('id, hostaway_listing_id').eq('user_id', auth.userId).not('hostaway_listing_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.hostaway_listing_id, p.id]));

      // Count current properties to enforce limits
      const { count: currentPropertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0, updated = 0, skippedDueToLimit = 0;

      for (const listing of allListings) {
        const mapped = mapListingToProperty(listing);
        const existingId = existingMap.get(String(listing.id));
        if (existingId) {
          await supabase.from('properties').update({ name: mapped.name, address_line1: mapped.address_line1, city: mapped.city, state: mapped.state, zip: mapped.zip, status: mapped.status }).eq('id', existingId);
          updated++;
        } else {
          // Check property limit before inserting new
          if (currentCount >= propertyLimit) {
            skippedDueToLimit++;
            continue;
          }

          const { error } = await supabase.from('properties').insert({ user_id: auth.userId, ...mapped });
          if (!error) {
            imported++;
            currentCount++;
          } else {
            console.error('Hostaway import error:', error.message);
          }
        }
      }
      results.listings = { imported, updated, total: allListings.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) {
        results.limitReached = true;
      }
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties').select('id, hostaway_listing_id').eq('user_id', auth.userId).not('hostaway_listing_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.hostaway_listing_id, p.id]));

      if (propertyMap.size > 0) {
        const { data: existing } = await supabase.from('revenue').select('hostaway_reservation_id').eq('user_id', auth.userId).not('hostaway_reservation_id', 'is', null);
        const existingIds = new Set((existing || []).map(r => r.hostaway_reservation_id));

        // Paginate through all reservations
        let allReservations: HostawayReservation[] = [];
        let offset = 0;
        const limit = 100;

        while (true) {
          const { reservations } = await getReservations(token, { limit, offset });
          allReservations = allReservations.concat(reservations);
          if (reservations.length < limit) break;
          offset += limit;
        }

        let imported = 0, skipped = 0;
        for (const res of allReservations) {
          if (existingIds.has(String(res.id))) { skipped++; continue; }
          const propertyId = propertyMap.get(String(res.listingMapId));
          if (!propertyId || !['confirmed', 'new', 'modified'].includes(res.status)) { skipped++; continue; }
          const mapped = mapReservationToRevenue(res, propertyId);
          const { error } = await supabase.from('revenue').insert({ user_id: auth.userId, ...mapped });
          if (!error) imported++; else skipped++;
        }
        results.reservations = { imported, skipped, total: allReservations.length };
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    await supabase.from('integration_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', auth.userId).eq('provider', 'hostaway');
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Hostaway sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
