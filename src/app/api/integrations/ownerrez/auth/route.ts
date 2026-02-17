import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
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

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('OwnerRez auth error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
