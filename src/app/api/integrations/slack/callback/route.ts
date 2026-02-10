import { NextRequest, NextResponse } from 'next/server';
import { exchangeSlackCode } from '@/lib/integrations/slack';

/**
 * GET /api/integrations/slack/callback — Slack OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_params', request.url)
      );
    }

    let stateData: { userId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', request.url)
      );
    }

    const slackData = await exchangeSlackCode(code);

    // TODO: Store bot token + team info in Supabase integration_connections table
    console.log('Slack OAuth complete for user:', stateData.userId, 'team:', slackData.team.name);

    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?connected=slack&team=${encodeURIComponent(slackData.team.name)}`,
        request.url
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Slack OAuth callback error:', message);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
