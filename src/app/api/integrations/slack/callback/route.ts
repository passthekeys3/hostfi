import { NextRequest, NextResponse } from 'next/server';
import { exchangeSlackCode } from '@/lib/integrations/slack';
import { encryptCredentials } from '@/lib/crypto';

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
    } catch (error) {
      console.error('Invalid Slack OAuth state:', error);
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', request.url)
      );
    }

    const slackData = await exchangeSlackCode(code);

    // Store bot token + team info in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey);

      await supabase.from('integration_connections').upsert({
        user_id: stateData.userId,
        provider: 'slack',
        access_token: slackData.access_token,
        credentials: process.env.CREDENTIALS_ENCRYPTION_KEY
          ? encryptCredentials({ access_token: slackData.access_token })
          : { access_token: slackData.access_token },
        metadata: {
          team_id: slackData.team.id,
          team_name: slackData.team.name,
          bot_user_id: slackData.bot_user_id,
        },
        active: true,
      }, { onConflict: 'user_id,provider' });
    }

    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?connected=slack`,
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
