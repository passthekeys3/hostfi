import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { createLinkToken, isPlaidConfigured } from '@/lib/integrations/plaid';

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

    // Demo mode
    if (!isPlaidConfigured()) {
      return NextResponse.json({
        link_token: 'demo-link-token-xxx',
        expiration: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        demo: true,
      });
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
