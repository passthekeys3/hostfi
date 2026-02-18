import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  getGuestyToken,
  getListings,
  getReservations,
  mapListingToProperty,
  mapReservationToRevenue,
  type GuestyListing,
  type GuestyReservation,
} from '@/lib/integrations/guesty';

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

    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials, active, status')
      .eq('user_id', auth.userId)
      .eq('provider', 'guesty')
      .single();

    if (!connection?.credentials || (connection.status !== 'connected' && connection.active !== true)) {
      return NextResponse.json({ error: 'Guesty not connected' }, { status: 400 });
    }

    const { readCredentials } = await import('@/lib/crypto');
    const { client_id, client_secret } = readCredentials(connection.credentials) as { client_id: string; client_secret: string };

    try {
      await getGuestyToken(client_id, client_secret);
    } catch (error) {
      console.error('Guesty authentication failed:', error);
      return NextResponse.json({ error: 'Guesty authentication failed. Please reconnect.' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', auth.userId).single();
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
      let allListings: GuestyListing[] = [];
      let skip = 0;
      const limit = 100;

      while (true) {
        const page = await getListings(limit, skip);
        allListings = allListings.concat(page.results);
        if (allListings.length >= page.count || page.results.length < limit) break;
        skip += limit;
      }

      // Dry run: return property list for selection UI
      if (dryRun) {
        results.listings = {
          imported: 0, updated: 0, total: allListings.length, skipped: 0,
          properties: allListings.map(l => ({
            id: l._id,
            name: l.title || l.nickname || 'Unnamed Listing',
            address: [l.address?.street, l.address?.city, l.address?.state].filter(Boolean).join(', ') || undefined,
          })),
        };
        return NextResponse.json({ success: true, results });
      }

      // Filter to selected if provided
      const listingsToSync = selectedPropertyIds
        ? allListings.filter(l => selectedPropertyIds.includes(l._id))
        : allListings;

      const { data: existingProps } = await supabase.from('properties')
        .select('id, guesty_listing_id').eq('user_id', auth.userId).not('guesty_listing_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.guesty_listing_id, p.id]));

      const { count: currentPropertyCount } = await supabase.from('properties')
        .select('*', { count: 'exact', head: true }).eq('user_id', auth.userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0, updated = 0, skippedDueToLimit = 0;

      for (const listing of listingsToSync) {
        const mapped = mapListingToProperty(listing);
        const existingId = existingMap.get(listing._id);
        if (existingId) {
          await supabase.from('properties').update({
            name: mapped.name, address_line1: mapped.address_line1, city: mapped.city,
            state: mapped.state, zip: mapped.zip, bedrooms: mapped.bedrooms,
            bathrooms: mapped.bathrooms, status: mapped.status,
          }).eq('id', existingId);
          updated++;
        } else {
          if (currentCount >= propertyLimit) { skippedDueToLimit++; continue; }
          const { error: insertError } = await supabase.from('properties').insert({ user_id: auth.userId, ...mapped });
          if (!insertError) { imported++; currentCount++; }
          else console.error('Failed to import listing:', listing._id, insertError.message);
        }
      }

      results.listings = { imported, updated, total: listingsToSync.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) results.limitReached = true;
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties')
        .select('id, guesty_listing_id').eq('user_id', auth.userId).not('guesty_listing_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.guesty_listing_id, p.id]));

      const relevantListingIds = selectedPropertyIds ? new Set(selectedPropertyIds) : null;

      if (propertyMap.size === 0) {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      } else {
        const { data: existingRevenue } = await supabase.from('revenue')
          .select('guesty_reservation_id').eq('user_id', auth.userId).not('guesty_reservation_id', 'is', null);
        const existingReservationIds = new Set((existingRevenue || []).map(r => r.guesty_reservation_id));

        let allReservations: GuestyReservation[] = [];
        let skip = 0;
        const limit = 25;

        while (true) {
          const page = await getReservations({ limit, skip });
          allReservations = allReservations.concat(page.results);
          if (allReservations.length >= page.count || page.results.length < limit) break;
          skip += limit;
        }

        let imported = 0, skipped = 0;
        for (const reservation of allReservations) {
          if (existingReservationIds.has(reservation._id)) { skipped++; continue; }
          if (relevantListingIds && !relevantListingIds.has(reservation.listingId)) { skipped++; continue; }
          const propertyId = propertyMap.get(reservation.listingId);
          if (!propertyId) { skipped++; continue; }
          const validStatuses = ['confirmed', 'checked_in', 'checked_out'];
          if (!validStatuses.includes(reservation.status)) { skipped++; continue; }
          const mapped = mapReservationToRevenue(reservation, propertyId);
          const { error: insertError } = await supabase.from('revenue').insert({ user_id: auth.userId, ...mapped });
          if (!insertError) imported++; else { skipped++; }
        }
        results.reservations = { imported, skipped, total: allReservations.length };
      }
    }

    await supabase.from('integration_connections').update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', auth.userId).eq('provider', 'guesty');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Guesty sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
