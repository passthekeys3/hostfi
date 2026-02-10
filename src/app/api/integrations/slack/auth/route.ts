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
        demo: true,
        message: 'Slack OAuth not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.',
      });
    }

    const state = Buffer.from(
      JSON.stringify({
        userId: auth.userId,
        nonce: crypto.randomBytes(16).toString('hex'),
      })
    ).toString('base64url');

    const url = getSlackAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
