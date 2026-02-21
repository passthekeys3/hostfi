import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { canAccessFeature, type Plan } from '@/lib/feature-gates';
import { getServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';

/**
 * OwnerRez OAuth Step 1: Redirect user to OwnerRez authorization page
 * GET /api/integrations/ownerrez/auth
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side plan check: Integrations require Pro plan
    const supabase = getServiceClient();
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', auth.userId)
        .single();
      const userPlan = (profile?.plan || 'free') as Plan;
      if (!canAccessFeature(userPlan, 'integrations')) {
        return NextResponse.json({ error: 'Integrations require a Pro plan.' }, { status: 403 });
      }
    }

    const clientId = process.env.OWNERREZ_OAUTH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'OwnerRez OAuth not configured' }, { status: 500 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/api/integrations/ownerrez/callback`;

    // State includes userId + CSRF token
    const csrfToken = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(JSON.stringify({
      userId: auth.userId,
      csrf: csrfToken,
      ts: Date.now(),
    })).toString('base64url');

    const authUrl = new URL('https://app.ownerrez.com/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    const response = NextResponse.json({ url: authUrl.toString() });

    // Store state in HttpOnly cookie for CSRF validation in callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
    });

    return response;
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('OwnerRez auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
