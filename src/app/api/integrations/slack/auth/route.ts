import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getSlackAuthUrl } from '@/lib/integrations/slack';
import crypto from 'crypto';

/**
 * GET /api/integrations/slack/auth — Start Slack OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    if (!process.env.SLACK_CLIENT_ID) {
      return NextResponse.json({
        error: 'Slack OAuth not configured',
      }, { status: 503 });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const state = Buffer.from(
      JSON.stringify({
        userId: auth.userId,
        nonce,
      })
    ).toString('base64url');

    const url = getSlackAuthUrl(state);
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
