import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('stripe-cancel', 3, 60_000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    if (!supabase) {
      return NextResponse.json({
        error: 'Service not configured',
      }, { status: 503 });
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // Cancel at period end (user keeps access until billing period ends)
    const response = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    return NextResponse.json({
      success: true,
      cancelAt: (response as Stripe.Subscription).cancel_at,
    });
  } catch (error: unknown) {
    console.error('Stripe cancel error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('API key') || message.includes('placeholder')) {
      return NextResponse.json({
        error: 'Stripe not configured',
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
