import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import {
  fetchProperties,
  fetchReservations,
  mapPropertyToHostFi,
  mapReservationToRevenue,
  extractExpensesFromReservation,
  authFromCredentials,
  getAccessToken,
  type HospitableProperty,
  type HospitableReservation,
} from '@/lib/integrations/hospitable';
import { encryptCredentials } from '@/lib/crypto';

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

    // Get connection credentials
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('credentials, active, status')
      .eq('user_id', userId)
      .eq('provider', 'hospitable')
      .single();

    if (!connection?.credentials || (connection.status !== 'connected' && connection.active !== true)) {
      return NextResponse.json({ error: 'Hospitable not connected' }, { status: 400 });
    }

    const { readCredentials } = await import('@/lib/crypto');
    const rawCredentials = readCredentials(connection.credentials);
    let credentials = authFromCredentials(rawCredentials);

    // Get valid access token (auto-refresh if needed)
    const tokenResult = await getAccessToken(credentials);
    const auth = tokenResult.auth;
    credentials = tokenResult.credentials;

    // If token was refreshed, save the new credentials
    if (tokenResult.refreshed) {
      await supabase
        .from('integration_connections')
        .update({
          credentials: process.env.CREDENTIALS_ENCRYPTION_KEY
            ? encryptCredentials(credentials as unknown as Record<string, unknown>)
            : credentials,
          access_token: credentials.access_token,
          metadata: {
            oauth: true,
            token_expires_at: credentials.token_expires_at,
          },
        })
        .eq('user_id', userId)
        .eq('provider', 'hospitable');
    }

    // Warn if refresh token is nearing 90-day expiry
    const refreshWarning = tokenResult.refreshExpiringSoon
      ? 'Hospitable connection expires soon. Please reconnect to avoid interruption.'
      : undefined;

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
      // Fetch all properties from Hospitable
      const allProperties: HospitableProperty[] = await fetchProperties(auth);

      // Dry run: return property list for selection UI
      if (dryRun) {
        results.listings = {
          imported: 0,
          updated: 0,
          total: allProperties.length,
          skipped: 0,
          properties: allProperties.map(p => ({
            id: p.id,
            name: p.name || p.public_name || 'Unnamed Property',
            address: [p.address?.street, p.address?.city, p.address?.state]
              .filter(Boolean)
              .join(', ') || undefined,
          })),
        };
        return NextResponse.json({ success: true, results });
      }

      // Filter to selected properties if provided
      const propertiesToSync = selectedPropertyIds
        ? allProperties.filter(p => selectedPropertyIds.includes(p.id))
        : allProperties;

      // Get existing Hospitable properties for this user
      const { data: existingProps } = await supabase
        .from('properties')
        .select('id, hospitable_property_id')
        .eq('user_id', userId)
        .not('hospitable_property_id', 'is', null);

      const existingMap = new Map(
        (existingProps || []).map(p => [p.hospitable_property_id, p.id])
      );

      const { count: currentPropertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      let currentCount = currentPropertyCount || 0;
      let imported = 0;
      let updated = 0;
      let skippedDueToLimit = 0;

      for (const prop of propertiesToSync) {
        const mapped = mapPropertyToHostFi(prop);
        const existingId = existingMap.get(prop.id);

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
            console.error('Hospitable import error:', error.message);
          }
        }
      }

      results.listings = { imported, updated, total: propertiesToSync.length, skipped: skippedDueToLimit };
      if (skippedDueToLimit > 0) {
        results.limitReached = true;
      }
    }

    if (syncType === 'reservations' || syncType === 'all') {
      // Get properties with Hospitable IDs
      const { data: props } = await supabase
        .from('properties')
        .select('id, hospitable_property_id')
        .eq('user_id', userId)
        .not('hospitable_property_id', 'is', null);

      const propertyMap = new Map(
        (props || []).map(p => [p.hospitable_property_id, p.id])
      );

      // Filter to selected properties if provided
      const relevantPropertyIds = selectedPropertyIds
        ? new Set(selectedPropertyIds)
        : null;

      if (propertyMap.size > 0) {
        // Force mode: delete all existing Hospitable revenue and re-import
        if (force) {
          await supabase
            .from('revenue')
            .delete()
            .eq('user_id', userId)
            .not('hospitable_reservation_id', 'is', null);
        }

        // Get existing reservation IDs to skip duplicates
        const { data: existing } = await supabase
          .from('revenue')
          .select('hospitable_reservation_id')
          .eq('user_id', userId)
          .not('hospitable_reservation_id', 'is', null);

        const existingIds = new Set(
          (existing || []).map(r => r.hospitable_reservation_id)
        );

        // Fetch reservations for all synced properties
        const hospPropertyIds = Array.from(propertyMap.keys());
        const allReservations: HospitableReservation[] = await fetchReservations(
          auth,
          hospPropertyIds
        );

        let imported = 0;
        let skipped = 0;
        const skipReasons: Record<string, number> = {};

        for (const reservation of allReservations) {
          // Skip if already exists
          if (existingIds.has(reservation.id)) {
            skipped++;
            skipReasons['already_exists'] = (skipReasons['already_exists'] || 0) + 1;
            continue;
          }

          // Skip if property not selected
          const hospPropId = reservation.property_id;
          if (relevantPropertyIds && hospPropId && !relevantPropertyIds.has(hospPropId)) {
            skipped++;
            skipReasons['not_selected'] = (skipReasons['not_selected'] || 0) + 1;
            continue;
          }

          // Find matching HostFi property
          const propertyId = hospPropId ? propertyMap.get(hospPropId) : null;
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

            // Extract host-side fees/taxes as expenses
            const expenses = extractExpensesFromReservation(reservation, propertyId);
            for (const expense of expenses) {
              await supabase
                .from('expenses')
                .insert({ user_id: userId, ...expense })
                .then(({ error: expErr }) => {
                  if (expErr) console.error('Hospitable expense insert error:', expErr.message);
                });
            }
          } else {
            skipped++;
            skipReasons['db_error'] = (skipReasons['db_error'] || 0) + 1;
            console.error('Hospitable reservation insert error:', error.message);
          }
        }

        results.reservations = { imported, skipped, total: allReservations.length, skipReasons };
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    // Update last synced timestamp
    await supabase
      .from('integration_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('provider', 'hospitable');

    return NextResponse.json({ success: true, results, ...(refreshWarning && { warning: refreshWarning }) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hospitable sync error:', message);

    // If refresh token expired, mark connection as needing reconnect
    if (message.includes('refresh token expired')) {
      const supabase2 = getServiceClient();
      if (supabase2) {
        // Try to get userId from the error context
        try {
          const session = await authenticateRequest();
          if (session.authenticated) {
            await supabase2
              .from('integration_connections')
              .update({ status: 'expired', active: false })
              .eq('user_id', session.userId)
              .eq('provider', 'hospitable');
          }
        } catch { /* best effort */ }
      }
      return NextResponse.json({ error: 'Hospitable connection expired. Please reconnect.', reconnect: true }, { status: 401 });
    }

    return NextResponse.json({ error: `Sync failed: ${message}` }, { status: 500 });
  }
}
