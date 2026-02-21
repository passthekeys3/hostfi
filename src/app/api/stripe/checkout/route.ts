import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, PLANS, type PlanId } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAsyncRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createAsyncRateLimiter('stripe-checkout', 5, 60_000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (await isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { plan, billing } = await request.json() as { plan: PlanId; billing: 'monthly' | 'annual' };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    if (plan === 'free') {
      return NextResponse.json({ error: 'Free plan does not require checkout' }, { status: 400 });
    }

    const priceId = billing === 'annual' ? planConfig.annualPriceId : planConfig.priceId;
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 400 });
    }

    // Get authenticated user from Supabase
    const supabase = await createClient();
    let customerEmail: string | undefined;
    let userId: string | undefined;
    let existingCustomerId: string | undefined;

    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        customerEmail = user.email;
        userId = user.id;

        // Check if user already has a Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('stripe_customer_id')
          .eq('id', user.id)
          .single();

        if (profile?.stripe_customer_id) {
          existingCustomerId = profile.stripe_customer_id;
        }
      }
    }

    const origin = request.nextUrl.origin;

    // Build checkout session options
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?upgrade=success&plan=${plan}`,
      cancel_url: `${origin}/dashboard/billing?upgrade=cancelled`,
      subscription_data: {
        metadata: { plan, billing, userId: userId || '' },
      },
      metadata: { plan, billing, userId: userId || '' },
      allow_promotion_codes: true,
    };

    // Link to existing customer or pass email for new customer
    if (existingCustomerId) {
      sessionConfig.customer = existingCustomerId;
    } else if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('API key') || message.includes('placeholder')) {
      return NextResponse.json({
        error: 'Stripe not configured',
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
