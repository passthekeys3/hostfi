import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getGoogleAuthUrl } from '@/lib/integrations/google';
import crypto from 'crypto';

/**
 * GET /api/integrations/google/auth — Start Google OAuth flow
 * Redirects to Google consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({
        error: 'Google OAuth not configured',
      }, { status: 503 });
    }

    // State token encodes user ID + CSRF protection
    const nonce = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({
        userId: auth.userId,
        nonce,
      })
    ).toString('base64url');

    const url = getGoogleAuthUrl(state);
    const response = NextResponse.redirect(url);

    // Store state in HttpOnly cookie for CSRF validation in callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
