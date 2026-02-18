import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import type { WebhookEventType, WebhookPayload, WebhookSubscription } from './types';

/**
 * Register a new webhook subscription (Zapier "subscribe" action)
 */
export async function createSubscription(
  userId: string,
  targetUrl: string,
  eventTypes: WebhookEventType[]
): Promise<WebhookSubscription> {
  const secret = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();

  const supabase = await createClient();

  if (!supabase) {
    throw new Error('Database not configured');
  }
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert({
      user_id: userId,
      target_url: targetUrl,
      event_types: eventTypes,
      secret,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create webhook subscription: ${error.message}`);
  }

  return {
    id: data.id,
    user_id: data.user_id,
    target_url: data.target_url,
    event_types: data.event_types as WebhookEventType[],
    secret: data.secret,
    active: data.active,
    created_at: data.created_at,
  };
}

/**
 * Remove a webhook subscription (Zapier "unsubscribe")
 */
export async function removeSubscription(subscriptionId: string, userId?: string): Promise<boolean> {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error('Database not configured');
  }
  const query = supabase.from('webhook_subscriptions').delete().eq('id', subscriptionId);
  
  // If userId provided, add extra filter (belt and suspenders with RLS)
  if (userId) {
    query.eq('user_id', userId);
  }

  const { error, count } = await query;

  if (error) {
    throw new Error(`Failed to remove webhook subscription: ${error.message}`);
  }

  // If count is available, use it; otherwise assume success if no error
  return count === null || count > 0;
}

/**
 * Get all active subscriptions for a user
 */
export async function getSubscriptions(userId: string): Promise<WebhookSubscription[]> {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error('Database not configured');
  }
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get webhook subscriptions: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    target_url: row.target_url,
    event_types: row.event_types as WebhookEventType[],
    secret: row.secret,
    active: row.active,
    created_at: row.created_at,
  }));
}

/**
 * Fire a webhook event to all matching subscribers
 */
export async function fireWebhookEvent(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ sent: number; errors: number }> {
  const supabase = await createClient();

  if (!supabase) {
    console.error('Database not configured for webhooks');
    return { sent: 0, errors: 0 };
  }

  // Query Supabase for matching subscriptions
  const { data: rows, error } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('event_types', [event]);

  if (error) {
    console.error('Failed to query webhook subscriptions:', error);
    return { sent: 0, errors: 0 };
  }

  const subs = (rows || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    target_url: row.target_url,
    event_types: row.event_types as WebhookEventType[],
    secret: row.secret,
    active: row.active,
    created_at: row.created_at,
  }));

  let sent = 0;
  let errors = 0;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const body = JSON.stringify(payload);
        const signature = crypto
          .createHmac('sha256', sub.secret)
          .update(body)
          .digest('hex');

        const res = await fetch(sub.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-HostFi-Signature': signature,
            'X-HostFi-Event': event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) sent++;
        else errors++;
      } catch (error) {
        console.error('Webhook delivery failed:', error);
        errors++;
      }
    })
  );

  return { sent, errors };
}

/**
 * List available webhook event types with descriptions
 */
export function getAvailableEvents(): Array<{ event: WebhookEventType; description: string }> {
  return [
    { event: 'expense.created', description: 'A new expense was added' },
    { event: 'expense.updated', description: 'An expense was modified' },
    { event: 'expense.deleted', description: 'An expense was removed' },
    { event: 'bill.due_soon', description: 'A bill is due within 3 days' },
    { event: 'bill.overdue', description: 'A bill is past its due date' },
    { event: 'anomaly.detected', description: 'AI detected an unusual charge' },
    { event: 'receipt.parsed', description: 'A receipt was successfully parsed' },
    { event: 'report.weekly', description: 'Weekly spending summary generated' },
    { event: 'report.monthly', description: 'Monthly P&L report generated' },
  ];
}
