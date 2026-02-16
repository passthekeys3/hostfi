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
 * POST /api/integrations/guesty/connect
 * Store Guesty credentials for a user (client_id + client_secret)
 * 
 * For now this is a simple credential store. When we move to marketplace OAuth,
 * this becomes the OAuth callback handler.
 */
export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { client_id, client_secret } = await request.json();

    if (!client_id || !client_secret) {
      return NextResponse.json({ error: 'client_id and client_secret required' }, { status: 400 });
    }

    // Verify credentials work by getting a token
    const tokenRes = await fetch('https://open-api.guesty.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      if (tokenRes.status === 429 || errBody.includes('TOO_MANY_REQUESTS')) {
        // Rate limited — credentials are likely fine, just save them
        console.log('[Guesty] Rate limited on token verify, saving credentials anyway');
      } else {
        return NextResponse.json({ error: 'Invalid Guesty credentials' }, { status: 400 });
      }
    }

    // Store the connection
    const { error } = await supabase
      .from('integration_connections')
      .upsert({
        user_id: auth.userId,
        provider: 'guesty',
        status: 'connected',
        credentials: { client_id, client_secret },
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (error) {
      console.error('Failed to store Guesty connection:', error);
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, connected: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Guesty connect error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/integrations/guesty/connect
 * Check if user has Guesty connected
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
      .select('status, connected_at')
      .eq('user_id', auth.userId)
      .eq('provider', 'guesty')
      .single();

    return NextResponse.json({
      connected: data?.status === 'connected',
      connectedAt: data?.connected_at || null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ connected: false });
  }
}

/**
 * DELETE /api/integrations/guesty/connect
 * Disconnect Guesty
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
      .update({ status: 'disconnected', credentials: null })
      .eq('user_id', auth.userId)
      .eq('provider', 'guesty');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
