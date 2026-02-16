import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { getProperties, getBookings, mapPropertyToHostFi, mapBookingToRevenue } from '@/lib/integrations/ownerrez';

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
      .select('credentials').eq('user_id', auth.userId).eq('provider', 'ownerrez').eq('status', 'connected').single();
    if (!connection?.credentials) return NextResponse.json({ error: 'OwnerRez not connected' }, { status: 400 });

    const { email, api_token } = connection.credentials as { email: string; api_token: string };
    const body = await request.json().catch(() => ({ type: 'all' }));
    const syncType = body.type || 'all';
    const results: Record<string, unknown> = {};

    if (syncType === 'listings' || syncType === 'all') {
      const { items: properties } = await getProperties(email, api_token);
      const { data: existingProps } = await supabase.from('properties')
        .select('id, ownerrez_property_id').eq('user_id', auth.userId).not('ownerrez_property_id', 'is', null);
      const existingMap = new Map((existingProps || []).map(p => [p.ownerrez_property_id, p.id]));

      let imported = 0, updated = 0;
      for (const prop of properties) {
        const mapped = mapPropertyToHostFi(prop);
        const existingId = existingMap.get(String(prop.id));
        if (existingId) {
          await supabase.from('properties').update({ name: mapped.name, address_line1: mapped.address_line1, city: mapped.city, state: mapped.state, zip: mapped.zip, status: mapped.status }).eq('id', existingId);
          updated++;
        } else {
          const { error } = await supabase.from('properties').insert({ user_id: auth.userId, ...mapped });
          if (!error) imported++; else console.error('OwnerRez import error:', error.message);
        }
      }
      results.listings = { imported, updated, total: properties.length };
    }

    if (syncType === 'reservations' || syncType === 'all') {
      const { data: props } = await supabase.from('properties').select('id, ownerrez_property_id').eq('user_id', auth.userId).not('ownerrez_property_id', 'is', null);
      const propertyMap = new Map((props || []).map(p => [p.ownerrez_property_id, p.id]));

      if (propertyMap.size > 0) {
        const { data: existing } = await supabase.from('revenue').select('ownerrez_booking_id').eq('user_id', auth.userId).not('ownerrez_booking_id', 'is', null);
        const existingIds = new Set((existing || []).map(r => r.ownerrez_booking_id));

        const { items: bookings } = await getBookings(email, api_token);
        let imported = 0, skipped = 0;
        for (const booking of bookings) {
          if (existingIds.has(String(booking.id))) { skipped++; continue; }
          const propertyId = propertyMap.get(String(booking.property_id));
          if (!propertyId) { skipped++; continue; }
          const mapped = mapBookingToRevenue(booking, propertyId);
          const { error } = await supabase.from('revenue').insert({ user_id: auth.userId, ...mapped });
          if (!error) imported++; else skipped++;
        }
        results.reservations = { imported, skipped, total: bookings.length };
      } else {
        results.reservations = { imported: 0, skipped: 0, total: 0 };
      }
    }

    await supabase.from('integration_connections').update({ last_synced_at: new Date().toISOString() }).eq('user_id', auth.userId).eq('provider', 'ownerrez');
    return NextResponse.json({ success: true, results });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('OwnerRez sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
