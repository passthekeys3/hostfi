import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * OwnerRez OAuth Step 2: Exchange temporary code for access token
 * GET /api/integrations/ownerrez/callback?code=xxx&state=xxx
 * 
 * Per OwnerRez docs: access tokens are long-lived (no refresh tokens).
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
      return NextResponse.redirect(`${redirectBase}?ownerrez=denied`);
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=missing_params`);
    }

    // Decode state
    let state: { userId: string; csrf: string; ts: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch {
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=invalid_state`);
    }

    // Check state isn't too old (15 min)
    if (Date.now() - state.ts > 15 * 60 * 1000) {
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=expired`);
    }

    const clientId = process.env.OWNERREZ_OAUTH_CLIENT_ID;
    const clientSecret = process.env.OWNERREZ_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=not_configured`);
    }

    const redirectUri = `${appUrl}/api/integrations/ownerrez/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://app.ownerrez.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('OwnerRez token exchange failed:', tokenRes.status, err);
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=token_exchange`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('OwnerRez token response missing access_token:', tokenData);
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=no_token`);
    }

    // Save connection
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=db_error`);
    }

    const { error: dbError } = await supabase.from('integration_connections').upsert({
      user_id: state.userId,
      provider: 'ownerrez',
      status: 'connected',
      credentials: { auth_type: 'oauth', access_token: accessToken },
      access_token: accessToken,
      connected_at: new Date().toISOString(),
      metadata: { oauth: true },
      active: true,
    }, { onConflict: 'user_id,provider' });

    if (dbError) {
      console.error('OwnerRez DB save error:', dbError);
      return NextResponse.redirect(`${redirectBase}?ownerrez=error&reason=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}?ownerrez=connected`);
  } catch (error) {
    console.error('OwnerRez callback error:', error);
    return NextResponse.redirect(`${redirectBase}?ownerrez=error`);
  }
}
