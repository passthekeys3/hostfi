import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { verifyCredentials } from '@/lib/integrations/ownerrez';
import { encryptCredentials } from '@/lib/crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const { email, api_token } = await request.json();
    if (!email || !api_token) return NextResponse.json({ error: 'Email and API Token required' }, { status: 400 });

    const valid = await verifyCredentials(email, api_token);
    if (!valid) return NextResponse.json({ error: 'Invalid OwnerRez credentials' }, { status: 400 });

    const { error } = await supabase.from('integration_connections').upsert({
      user_id: auth.userId, provider: 'ownerrez', status: 'connected',
      credentials: process.env.CREDENTIALS_ENCRYPTION_KEY ? encryptCredentials({ email, api_token }) : { email, api_token }, connected_at: new Date().toISOString(),
      access_token: 'ownerrez_basic_auth', metadata: {}, active: true,
    }, { onConflict: 'user_id,provider' });

    if (error) return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
    return NextResponse.json({ success: true, connected: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) return NextResponse.json({ connected: false });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ connected: false });
    const { data } = await supabase.from('integration_connections')
      .select('status, connected_at, active, credentials').eq('user_id', auth.userId).eq('provider', 'ownerrez').single();
    const isConnected = !!data && (data.status === 'connected' || data.active === true) && !!data.credentials;
    
    // Check if user has synced any properties from this PMS
    let syncedCount = 0;
    if (isConnected) {
      const { count } = await supabase.from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .not('ownerrez_property_id', 'is', null);
      syncedCount = count || 0;
    }
    
    return NextResponse.json({ connected: isConnected, connectedAt: data?.connected_at || null, syncedCount });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    await supabase.from('integration_connections').update({ status: 'disconnected', credentials: null, active: false })
      .eq('user_id', auth.userId).eq('provider', 'ownerrez');
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
