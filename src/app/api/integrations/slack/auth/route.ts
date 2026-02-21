import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getSlackAuthUrl } from '@/lib/integrations/slack';
import { canAccessFeature, type Plan } from '@/lib/feature-gates';
import { getServiceClient } from '@/lib/supabase/service';
import crypto from 'crypto';

/**
 * GET /api/integrations/slack/auth — Start Slack OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    // Server-side plan check: Slack requires Business plan
    const supabase = getServiceClient();
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', auth.userId)
        .single();
      const userPlan = (profile?.plan || 'free') as Plan;
      if (!canAccessFeature(userPlan, 'slack')) {
        return NextResponse.json({ error: 'Slack integration requires a Business plan.' }, { status: 403 });
      }
    }

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
