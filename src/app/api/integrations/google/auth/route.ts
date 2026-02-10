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

    // In demo mode, return the URL without redirecting
    if (!process.env.GOOGLE_CLIENT_ID) {
      return NextResponse.json({
        demo: true,
        message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }

    // State token encodes user ID + CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: auth.userId,
        nonce: crypto.randomBytes(16).toString('hex'),
      })
    ).toString('base64url');

    const url = getGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
