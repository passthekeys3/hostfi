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

/**
 * POST /api/integrations/guesty/sync
 * Sync listings and reservations from Guesty into HostFi
 * 
 * Body: { type: 'listings' | 'reservations' | 'all' }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Get user's Guesty credentials
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials')
      .eq('user_id', auth.userId)
      .eq('provider', 'guesty')
      .eq('status', 'connected')
      .single();

    if (!connection?.credentials) {
      return NextResponse.json({ error: 'Guesty not connected' }, { status: 400 });
    }

    const { client_id, client_secret } = connection.credentials as { client_id: string; client_secret: string };

    // Verify token works
    try {
      await getGuestyToken(client_id, client_secret);
    } catch {
      return NextResponse.json({ error: 'Guesty authentication failed. Please reconnect.' }, { status: 401 });
    }

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

    // ========================================================================
    // Sync Listings → Properties
    // ========================================================================
    if (syncType === 'listings' || syncType === 'all') {
      let allListings: GuestyListing[] = [];
      let skip = 0;
      const limit = 100;

      // Paginate through all listings
      while (true) {
        const page = await getListings(limit, skip);
        allListings = allListings.concat(page.results);
        if (allListings.length >= page.count || page.results.length < limit) break;
        skip += limit;
      }

      // Get existing properties with guesty IDs for this user
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id, guesty_listing_id')
        .eq('user_id', auth.userId)
        .not('guesty_listing_id', 'is', null);

      const existingMap = new Map(
        (existingProps || []).map(p => [p.guesty_listing_id, p.id])
      );

      // Count current properties to enforce limits
      const { count: currentPropertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0;
      let updated = 0;
      let skippedDueToLimit = 0;

      for (const listing of allListings) {
        const mapped = mapListingToProperty(listing);
        const existingId = existingMap.get(listing._id);

        if (existingId) {
          // Update existing property (doesn't count against limit)
          await supabase
            .from('properties')
            .update({
              name: mapped.name,
              address_line1: mapped.address_line1,
              city: mapped.city,
              state: mapped.state,
              zip: mapped.zip,
              bedrooms: mapped.bedrooms,
              bathrooms: mapped.bathrooms,
              status: mapped.status,
            })
            .eq('id', existingId);
          updated++;
        } else {
          // Check property limit before inserting new
          if (currentCount >= propertyLimit) {
            skippedDueToLimit++;
            continue;
          }

          // Create new property
          const { error: insertError } = await supabase
            .from('properties')
            .insert({
              user_id: auth.userId,
              ...mapped,
            });
          if (!insertError) {
            imported++;
            currentCount++;
          } else {
            console.error('Failed to import listing:', listing._id, insertError.message);
          }
        }
      }

      results.listings = { imported, updated, total: allListings.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) {
        results.limitReached = true;
      }
    }

    // ========================================================================
    // Sync Reservations → Revenue
    // ========================================================================
    if (syncType === 'reservations' || syncType === 'all') {
      // Get property mapping (guesty_listing_id → hostfi property id)
      const { data: props } = await supabase
        .from('properties')
        .select('id, guesty_listing_id')
        .eq('user_id', auth.userId)
        .not('guesty_listing_id', 'is', null);

      const propertyMap = new Map(
        (props || []).map(p => [p.guesty_listing_id, p.id])
      );

      if (propertyMap.size === 0) {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      } else {
        // Get existing revenue entries with guesty IDs
        const { data: existingRevenue } = await supabase
          .from('revenue')
          .select('guesty_reservation_id')
          .eq('user_id', auth.userId)
          .not('guesty_reservation_id', 'is', null);

        const existingReservationIds = new Set(
          (existingRevenue || []).map(r => r.guesty_reservation_id)
        );

        let allReservations: GuestyReservation[] = [];
        let skip = 0;
        const limit = 25;

        // Paginate through reservations
        while (true) {
          const page = await getReservations({ limit, skip });
          allReservations = allReservations.concat(page.results);
          if (allReservations.length >= page.count || page.results.length < limit) break;
          skip += limit;
        }

        let imported = 0;
        let skipped = 0;

        for (const reservation of allReservations) {
          // Skip if already imported
          if (existingReservationIds.has(reservation._id)) {
            skipped++;
            continue;
          }

          // Find matching HostFi property
          const propertyId = propertyMap.get(reservation.listingId);
          if (!propertyId) {
            skipped++;
            continue;
          }

          // Only import confirmed/checked-in/checked-out reservations
          const validStatuses = ['confirmed', 'checked_in', 'checked_out'];
          if (!validStatuses.includes(reservation.status)) {
            skipped++;
            continue;
          }

          const mapped = mapReservationToRevenue(reservation, propertyId);

          const { error: insertError } = await supabase
            .from('revenue')
            .insert({
              user_id: auth.userId,
              ...mapped,
            });

          if (!insertError) imported++;
          else {
            console.error('Failed to import reservation:', reservation._id, insertError.message);
            skipped++;
          }
        }

        results.reservations = { imported, skipped, total: allReservations.length };
      }
    }

    // Update last sync timestamp
    await supabase
      .from('integration_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', auth.userId)
      .eq('provider', 'guesty');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Guesty sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
