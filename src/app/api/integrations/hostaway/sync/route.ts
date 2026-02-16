import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getHostawayToken, getListings, getReservations, mapListingToProperty, mapReservationToRevenue } from '@/lib/integrations/hostaway';

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

    const { account_id, api_key } = connection.credentials as { account_id: string; api_key: string };
    const token = await getHostawayToken(account_id, api_key);

    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const results: Record<string, unknown> = {};

    if (syncType === 'listings' || syncType === 'all') {
      const listings = await getListings(token);
      const { data: existingProps } = await supabase.from('properties')
        .select('id, hostaway_listing_id').eq('user_id', auth.userId).not('hostaway_listing_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.hostaway_listing_id, p.id]));

      let imported = 0, updated = 0;
      for (const listing of listings) {
        const mapped = mapListingToProperty(listing);
        const existingId = existingMap.get(String(listing.id));
        if (existingId) {
          await supabase.from('properties').update({ name: mapped.name, address_line1: mapped.address_line1, city: mapped.city, state: mapped.state, zip: mapped.zip, status: mapped.status }).eq('id', existingId);
          updated++;
        } else {
          const { error } = await supabase.from('properties').insert({ user_id: auth.userId, ...mapped });
          if (!error) imported++; else console.error('Hostaway import error:', error.message);
        }
      }
      results.listings = { imported, updated, total: listings.length };
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties').select('id, hostaway_listing_id').eq('user_id', auth.userId).not('hostaway_listing_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.hostaway_listing_id, p.id]));

      if (propertyMap.size > 0) {
        const { data: existing } = await supabase.from('revenue').select('hostaway_reservation_id').eq('user_id', auth.userId).not('hostaway_reservation_id', 'is', null);
        const existingIds = new Set((existing || []).map(r => r.hostaway_reservation_id));

        const reservations = await getReservations(token, { limit: '100' });
        let imported = 0, skipped = 0;
        for (const res of reservations) {
          if (existingIds.has(String(res.id))) { skipped++; continue; }
          const propertyId = propertyMap.get(String(res.listingMapId));
          if (!propertyId || !['confirmed', 'new', 'modified'].includes(res.status)) { skipped++; continue; }
          const mapped = mapReservationToRevenue(res, propertyId);
          const { error } = await supabase.from('revenue').insert({ user_id: auth.userId, ...mapped });
          if (!error) imported++; else skipped++;
        }
        results.reservations = { imported, skipped, total: reservations.length };
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
