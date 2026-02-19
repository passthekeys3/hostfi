import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { WebhookEventType, WebhookPayload, WebhookSubscription } from './types';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Fire a webhook event to all matching subscribers (server-side version)
 * Uses service role key for server contexts like webhook handlers
 */
export async function fireWebhookEventServer(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ sent: number; errors: number }> {
  const supabase = getServiceClient();

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

  const subs: WebhookSubscription[] = (rows || []).map(row => ({
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
