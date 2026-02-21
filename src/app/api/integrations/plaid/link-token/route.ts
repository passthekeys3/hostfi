import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { createLinkToken, isPlaidConfigured } from '@/lib/integrations/plaid';
import { canAccessFeature, type Plan } from '@/lib/feature-gates';
import { getServiceClient } from '@/lib/supabase/service';

const rateLimiter = createRateLimiter('plaid-link', 10, 60_000);

/**
 * POST /api/integrations/plaid/link-token
 * Create a Plaid Link token to initialize the frontend widget
 * Body (optional): { access_token?: string } — for update mode
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

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

    if (!isPlaidConfigured()) {
      return NextResponse.json({
        error: 'Plaid not configured',
      }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));

    const result = await createLinkToken({
      userId: auth.userId,
      accessToken: body.access_token,
      redirectUri: body.redirect_uri,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
