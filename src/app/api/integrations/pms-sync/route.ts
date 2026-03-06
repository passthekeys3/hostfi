import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/integrations/pms-sync
 * 
 * Cron-triggered auto-sync for PMS integrations that lack webhooks
 * (Hostaway, Guesty). Runs periodically to pull new bookings.
 * 
 * Protected by CRON_SECRET — only called by Vercel Cron or manual trigger.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  const results: { provider: string; userId: string; status: string; error?: string }[] = [];

  try {
    // Find all active Hostaway, Guesty, and Hospitable connections
    const { data: connections, error } = await supabase
      .from('integration_connections')
      .select('id, user_id, provider, credentials, metadata')
      .in('provider', ['hostaway', 'guesty', 'hospitable', 'hospitable_connect', 'lodgify'])
      .eq('status', 'connected')
      .eq('active', true);

    if (error || !connections?.length) {
      return NextResponse.json({ 
        message: 'No active PMS connections to sync',
        count: 0,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not configured' }, { status: 500 });
    }

    // Trigger sync for each connection
    for (const conn of connections) {
      try {
        // Convert provider DB name to URL path (hospitable_connect → hospitable-connect)
        const providerPath = conn.provider.replace(/_/g, '-');
        const syncUrl = `${appUrl}/api/integrations/${providerPath}/sync`;
        
        // Call the existing sync endpoint with service-level auth
        // We pass the user context in the body since this is a server-to-server call
        const res = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`,
            'X-Cron-User-Id': conn.user_id,
          },
          body: JSON.stringify({
            cronSync: true,
            userId: conn.user_id,
          }),
        });

        const data = await res.json().catch(() => ({}));
        results.push({
          provider: conn.provider,
          userId: conn.user_id,
          status: res.ok ? 'synced' : 'failed',
          error: res.ok ? undefined : (data.error || `HTTP ${res.status}`),
        });
      } catch (err) {
        results.push({
          provider: conn.provider,
          userId: conn.user_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `PMS auto-sync complete`,
      synced: results.filter(r => r.status === 'synced').length,
      failed: results.filter(r => r.status !== 'synced').length,
      results,
    });
  } catch (err) {
    console.error('[pms-sync] Cron sync error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
