import crypto from 'crypto';
import type { WebhookEventType, WebhookPayload, WebhookSubscription } from './types';

// In-memory store for demo mode. In production, these live in Supabase.
const demoSubscriptions: WebhookSubscription[] = [];

/**
 * Register a new webhook subscription (Zapier "subscribe" action)
 */
export function createSubscription(
  userId: string,
  targetUrl: string,
  eventTypes: WebhookEventType[]
): WebhookSubscription {
  const sub: WebhookSubscription = {
    id: crypto.randomUUID(),
    user_id: userId,
    target_url: targetUrl,
    event_types: eventTypes,
    secret: crypto.randomBytes(32).toString('hex'),
    active: true,
    created_at: new Date().toISOString(),
  };
  demoSubscriptions.push(sub);
  return sub;
}

/**
 * Remove a webhook subscription (Zapier "unsubscribe")
 */
export function removeSubscription(subscriptionId: string): boolean {
  const idx = demoSubscriptions.findIndex(s => s.id === subscriptionId);
  if (idx === -1) return false;
  demoSubscriptions.splice(idx, 1);
  return true;
}

/**
 * Get all active subscriptions for a user
 */
export function getSubscriptions(userId: string): WebhookSubscription[] {
  return demoSubscriptions.filter(s => s.user_id === userId && s.active);
}

/**
 * Fire a webhook event to all matching subscribers
 */
export async function fireWebhookEvent(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ sent: number; errors: number }> {
  const subs = demoSubscriptions.filter(
    s => s.user_id === userId && s.active && s.event_types.includes(event)
  );

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
      } catch {
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
