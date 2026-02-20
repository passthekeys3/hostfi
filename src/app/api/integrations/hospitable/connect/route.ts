import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/integrations/hospitable/connect
 * Check connection status + count of synced properties
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ connected: false });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ connected: false });
    }

    const { data } = await supabase
      .from('integration_connections')
      .select('status, connected_at, active, credentials')
      .eq('user_id', auth.userId)
      .eq('provider', 'hospitable')
      .single();

    const isConnected = !!data && 
      (data.status === 'connected' || data.active === true) && 
      !!data.credentials;

    // Count synced properties
    let syncedCount = 0;
    if (isConnected) {
      const { count } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .not('hospitable_property_id', 'is', null);
      syncedCount = count || 0;
    }

    return NextResponse.json({
      connected: isConnected,
      connectedAt: data?.connected_at || null,
      syncedCount,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ connected: false });
  }
}

/**
 * DELETE /api/integrations/hospitable/connect
 * Disconnect the Hospitable integration
 */
export async function DELETE() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    await supabase
      .from('integration_connections')
      .update({ 
        status: 'disconnected', 
        credentials: null, 
        active: false 
      })
      .eq('user_id', auth.userId)
      .eq('provider', 'hospitable');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
