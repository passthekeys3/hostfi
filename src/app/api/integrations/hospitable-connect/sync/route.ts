/**
 * POST /api/integrations/hospitable-connect/sync - Sync listings and reservations
 * 
 * Supports both user auth and cron auth.
 * Property selection: dryRun=true returns list, dryRun=false imports selected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  fetchListings,
  fetchReservations,
  fetchChannels,
  mapListingToProperty,
  mapReservationToRevenue,
  extractExpenses,
  type HospitableConnectListing,
  type HospitableConnectReservation,
} from '@/lib/integrations/hospitable-connect';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    // Support both user auth and cron auth
    let userId: string;
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const cronUserId = request.headers.get('x-cron-user-id');

    if (cronSecret && authHeader === `Bearer ${cronSecret}` && cronUserId) {
      // Cron-triggered sync
      userId = cronUserId;
    } else {
      // User-triggered sync
      const session = await authenticateRequest();
      if (!session.authenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.userId;
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Get connection record
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('id, metadata, status, active')
      .eq('user_id', userId)
      .eq('provider', 'hospitable_connect')
      .single();

    if (!connection || (!connection.active && connection.status !== 'connected')) {
      return NextResponse.json({ error: 'Hospitable Connect not connected' }, { status: 400 });
    }

    const customerId = connection.metadata?.hospitable_connect_customer_id as string;
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID not found' }, { status: 400 });
    }

    // Get user's plan for property limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    const userPlan = (profile?.plan || 'free') as Plan;
    const propertyLimit = PROPERTY_LIMITS[userPlan];

    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const dryRun = body.dryRun === true;
    const force = body.force === true;
    const selectedListingIds: string[] | null = body.selectedPropertyIds || null;

    const results: {
      listings?: {
        imported: number;
        updated: number;
        total: number;
        skipped: number;
        properties?: { id: string; name: string; address?: string }[];
      };
      reservations?: { imported: number; skipped: number; total: number; skipReasons?: Record<string, number> };
      expenses?: { imported: number };
      limitReached?: boolean;
      channels?: { platform: string; name?: string | null }[];
    } = {};

    // Fetch channels first (useful for UI to show connected platforms)
    if (syncType === 'all' || syncType === 'channels') {
      try {
        const channels = await fetchChannels(customerId);
        results.channels = channels.map(c => ({ platform: c.platform, name: c.name }));
      } catch (error) {
        console.warn('Failed to fetch channels:', error);
      }
    }

    if (syncType === 'listings' || syncType === 'all') {
      // Fetch all listings from Hospitable Connect
      const allListings: HospitableConnectListing[] = await fetchListings(customerId);

      // Dry run: return property list for selection UI
      if (dryRun) {
        results.listings = {
          imported: 0,
          updated: 0,
          total: allListings.length,
          skipped: 0,
          properties: allListings.map(l => ({
            id: l.id,
            name: l.public_name || l.private_name || 'Unnamed Property',
            address: [l.address?.street, l.address?.city, l.address?.state]
              .filter(Boolean)
              .join(', ') || undefined,
          })),
        };
        return NextResponse.json({ success: true, results });
      }

      // Filter to selected listings if provided
      const listingsToSync = selectedListingIds
        ? allListings.filter(l => selectedListingIds.includes(l.id))
        : allListings;

      // Get existing properties for this user with Hospitable Connect IDs
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id, hospitable_connect_listing_id')
        .eq('user_id', userId)
        .not('hospitable_connect_listing_id', 'is', null);

      const existingMap = new Map(
        (existingProps || []).map(p => [p.hospitable_connect_listing_id, p.id])
      );

      const { count: currentPropertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0;
      let updated = 0;
      let skippedDueToLimit = 0;

      for (const listing of listingsToSync) {
        const mapped = mapListingToProperty(listing);
        const existingId = existingMap.get(listing.id);

        if (existingId) {
          // Update existing property
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
            .eq('id', existingId);
          updated++;
        } else {
          // Check plan limit before inserting
          if (currentCount >= propertyLimit) {
            skippedDueToLimit++;
            continue;
          }

          const { error } = await supabase
            .from('properties')
            .insert({ user_id: userId, ...mapped });

          if (!error) {
            imported++;
            currentCount++;
          } else {
            console.error('Hospitable Connect property import error:', error.message);
          }
        }
      }

      results.listings = { imported, updated, total: listingsToSync.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) {
        results.limitReached = true;
      }
    }

    if (syncType === 'reservations' || syncType === 'all') {
      // Get properties with Hospitable Connect listing IDs
      const { data: props } = await supabase
        .from('properties')
        .select('id, hospitable_connect_listing_id')
        .eq('user_id', userId)
        .not('hospitable_connect_listing_id', 'is', null);

      // Map listing_id → property_id
      const propertyMap = new Map(
        (props || []).map(p => [p.hospitable_connect_listing_id, p.id])
      );

      // Filter to selected properties if provided
      const relevantListingIds = selectedListingIds
        ? new Set(selectedListingIds)
        : null;

      if (propertyMap.size > 0) {
        // Force mode: delete all existing Hospitable Connect revenue and re-import
        if (force) {
          await supabase
            .from('revenue')
            .delete()
            .eq('user_id', userId)
            .not('hospitable_connect_reservation_id', 'is', null);
          
          // Also delete related expenses (cleaning fees, taxes)
          // Note: We can't easily identify which expenses came from which sync
          // For now, we just re-import and skip duplicates
        }

        // Get existing reservation IDs to skip duplicates
        const { data: existing } = await supabase
          .from('revenue')
          .select('hospitable_connect_reservation_id')
          .eq('user_id', userId)
          .not('hospitable_connect_reservation_id', 'is', null);

        const existingIds = new Set(
          (existing || []).map(r => r.hospitable_connect_reservation_id)
        );

        // Fetch all reservations for this customer
        const allReservations: HospitableConnectReservation[] = await fetchReservations(customerId);

        let imported = 0;
        let skipped = 0;
        let expenseImported = 0;
        const skipReasons: Record<string, number> = {};

        for (const reservation of allReservations) {
          // Skip if already exists
          if (existingIds.has(reservation.id)) {
            skipped++;
            skipReasons['already_exists'] = (skipReasons['already_exists'] || 0) + 1;
            continue;
          }

          // Get listing ID from reservation
          const listingId = reservation.listing_id || reservation.listing?.id;

          // Skip if listing not selected
          if (relevantListingIds && listingId && !relevantListingIds.has(listingId)) {
            skipped++;
            skipReasons['not_selected'] = (skipReasons['not_selected'] || 0) + 1;
            continue;
          }

          // Find matching HostFi property
          const propertyId = listingId ? propertyMap.get(listingId) : null;
          if (!propertyId) {
            skipped++;
            skipReasons['no_matching_property'] = (skipReasons['no_matching_property'] || 0) + 1;
            continue;
          }

          const mapped = mapReservationToRevenue(reservation, propertyId);
          const { error } = await supabase
            .from('revenue')
            .insert({ user_id: userId, ...mapped });

          if (!error) {
            imported++;

            // Extract expenses (cleaning fees, taxes) from the reservation
            const expenses = extractExpenses(reservation, propertyId);
            for (const expense of expenses) {
              const { error: expErr } = await supabase
                .from('expenses')
                .insert({ user_id: userId, ...expense });
              
              if (!expErr) {
                expenseImported++;
              } else {
                console.warn('Hospitable Connect expense insert error:', expErr.message);
              }
            }
          } else {
            skipped++;
            skipReasons['db_error'] = (skipReasons['db_error'] || 0) + 1;
            console.error('Hospitable Connect reservation insert error:', error.message);
          }
        }

        results.reservations = { imported, skipped, total: allReservations.length, skipReasons };
        results.expenses = { imported: expenseImported };
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    // Update last synced timestamp
    await supabase
      .from('integration_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'hospitable_connect');

    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hospitable Connect sync error:', message);
    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
