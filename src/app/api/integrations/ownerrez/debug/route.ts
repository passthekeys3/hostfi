import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { authFromCredentials } from '@/lib/integrations/ownerrez';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Temporary debug endpoint — returns raw OwnerRez booking data
export async function GET() {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const { data: connection } = await supabase.from('integration_connections')
      .select('credentials, active, status')
      .eq('user_id', session.userId)
      .eq('provider', 'ownerrez')
      .single();

    if (!connection?.credentials) return NextResponse.json({ error: 'Not connected' }, { status: 400 });

    const { readCredentials } = await import('@/lib/crypto');
    const auth = authFromCredentials(readCredentials(connection.credentials));

    // Fetch raw booking data directly
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    
    const url = new URL('https://api.ownerrez.com/v2/bookings');
    url.searchParams.set('since_utc', since.toISOString());
    url.searchParams.set('page_size', '5');

    const buildAuthHeader = auth.type === 'oauth' && auth.accessToken
      ? `Bearer ${auth.accessToken}`
      : 'Basic ' + Buffer.from(`${auth.email}:${auth.apiToken}`).toString('base64');

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': buildAuthHeader, 'Content-Type': 'application/json' },
    });

    const raw = await res.json();
    return NextResponse.json({ status: res.status, raw });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
