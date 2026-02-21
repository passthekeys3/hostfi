import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Get Supabase client (may be null if not configured)
  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;
        const plan = session.metadata?.plan || 'pro';
        const customerEmail = session.customer_email || session.customer_details?.email;

        console.info(`Checkout completed: plan=${plan}`);

        if (!supabase) {
          console.info('Supabase not configured — skipping DB update');
          break;
        }

        // Find user by email and update their profile
        if (customerEmail) {
          const { error } = await supabase
            .from('profiles')
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('email', customerEmail);

          if (error) {
            console.error('Failed to update profile after checkout:', error);
          } else {
            console.info('Profile updated after checkout');
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = subscription.metadata?.plan;
        const status = subscription.status;
        const subscriptionId = subscription.id;

        console.info(`Subscription updated: status=${status}`);

        if (!supabase) {
          console.info('Supabase not configured — skipping DB update');
          break;
        }

        // Map Stripe status to our simplified status
        let subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing' = 'active';
        if (status === 'past_due') subscriptionStatus = 'past_due';
        else if (status === 'canceled' || status === 'unpaid') subscriptionStatus = 'canceled';
        else if (status === 'trialing') subscriptionStatus = 'trialing';

        const updateData: Record<string, unknown> = {
          subscription_status: subscriptionStatus,
          updated_at: new Date().toISOString(),
        };

        // Update plan if provided in metadata
        if (plan) {
          updateData.plan = plan;
        }

        // Downgrade to free on unpaid/canceled status (subscription is effectively dead)
        if (status === 'unpaid' || status === 'canceled') {
          updateData.plan = 'free';
        }

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Failed to update subscription status:', error);
        } else {
          console.info('Subscription status updated');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        console.info('Subscription cancelled');

        if (!supabase) {
          console.info('Supabase not configured — skipping DB update');
          break;
        }

        // Downgrade to free plan
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Failed to downgrade user after subscription deletion:', error);
        } else {
          console.info('User downgraded to free plan');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string | undefined;
        const customerEmail = invoice.customer_email;

        console.info('Payment failed for subscription');

        if (!supabase) {
          console.info('Supabase not configured — skipping DB update');
          break;
        }

        // Mark subscription as past_due
        if (subscriptionId) {
          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (error) {
            console.error('Failed to mark subscription as past_due:', error);
          } else {
            console.info('Subscription marked past_due');
          }
        }

        // In production: Could trigger dunning email here
        // await sendPaymentFailedEmail(customerEmail);
        break;
      }

      default:
        console.info(`Unhandled webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
