import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encryptCredentials } from '@/lib/crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Hospitable OAuth Step 2: Exchange temporary code for access token
 * GET /api/integrations/hospitable/callback?code=xxx&state=xxx
 * 
 * Hospitable tokens:
 * - Access token expires in 12 hours
 * - Refresh token expires in 90 days
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai';
  const redirectBase = `${appUrl}/dashboard/integrations`;

  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const errorParam = request.nextUrl.searchParams.get('error');

    // User denied access
    if (errorParam) {
      return NextResponse.redirect(`${redirectBase}?hospitable=denied`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=missing_params`);
    }

    // Decode state
    let state: { userId: string; csrf: string; ts: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=invalid_state`);
    }

    // Check state isn't too old (15 min)
    if (Date.now() - state.ts > 15 * 60 * 1000) {
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=expired`);
    }

    const clientId = process.env.HOSPITABLE_CLIENT_ID;
    const clientSecret = process.env.HOSPITABLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=not_configured`);
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://auth.hospitable.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Hospitable token exchange failed:', tokenRes.status, err);
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=token_exchange&detail=${encodeURIComponent(err.substring(0, 200))}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken || !refreshToken) {
      console.error('Hospitable token response missing tokens:', tokenData);
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=no_token`);
    }

    // Calculate token expiry (12 hours = 43200 seconds)
    const expiresIn = tokenData.expires_in || 43200;
    const tokenExpiresAt = Date.now() + expiresIn * 1000;

    // Save connection
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=db_error`);
    }

    const credentials = {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
    };

    const { error: dbError } = await supabase.from('integration_connections').upsert({
      user_id: state.userId,
      provider: 'hospitable',
      status: 'connected',
      credentials: process.env.CREDENTIALS_ENCRYPTION_KEY 
        ? encryptCredentials(credentials) 
        : credentials,
      access_token: accessToken,
      connected_at: new Date().toISOString(),
      metadata: { 
        oauth: true,
        token_expires_at: tokenExpiresAt,
      },
      active: true,
    }, { onConflict: 'user_id,provider' });

    if (dbError) {
      console.error('Hospitable DB save error:', dbError);
      return NextResponse.redirect(`${redirectBase}?hospitable=error&reason=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}?hospitable=connected`);
  } catch (error) {
    console.error('Hospitable callback error:', error);
    return NextResponse.redirect(`${redirectBase}?hospitable=error`);
  }
}
