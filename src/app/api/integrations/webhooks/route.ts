import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  createSubscription,
  removeSubscription,
  getSubscriptions,
  getAvailableEvents,
} from '@/lib/integrations/webhooks';
import type { WebhookEventType } from '@/lib/integrations/types';

const rateLimiter = createRateLimiter('webhooks', 30, 60_000);

const VALID_EVENTS: WebhookEventType[] = [
  'expense.created', 'expense.updated', 'expense.deleted',
  'bill.due_soon', 'bill.overdue', 'anomaly.detected',
  'receipt.parsed', 'report.weekly', 'report.monthly',
];

/**
 * GET /api/integrations/webhooks — List subscriptions + available events
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const subscriptions = getSubscriptions(auth.userId);
    const events = getAvailableEvents();

    return NextResponse.json({ subscriptions, available_events: events });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/webhooks — Create a subscription (Zapier subscribe)
 * Body: { target_url: string, event_types: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { target_url, event_types } = body as { target_url: string; event_types: string[] };

    if (!target_url || typeof target_url !== 'string') {
      return NextResponse.json({ error: 'target_url is required' }, { status: 400 });
    }

    // Validate URL
    try { new URL(target_url); } catch {
      return NextResponse.json({ error: 'Invalid target_url' }, { status: 400 });
    }

    if (!Array.isArray(event_types) || event_types.length === 0) {
      return NextResponse.json({ error: 'event_types must be a non-empty array' }, { status: 400 });
    }

    // Validate event types
    const invalid = event_types.filter(e => !VALID_EVENTS.includes(e as WebhookEventType));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Invalid event types: ${invalid.join(', ')}` }, { status: 400 });
    }

    // Max 20 subscriptions per user
    const existing = getSubscriptions(auth.userId);
    if (existing.length >= 20) {
      return NextResponse.json({ error: 'Maximum 20 webhook subscriptions allowed' }, { status: 400 });
    }

    const sub = createSubscription(auth.userId, target_url, event_types as WebhookEventType[]);
    return NextResponse.json(sub, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/webhooks — Remove a subscription (Zapier unsubscribe)
 * Body: { subscription_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { subscription_id } = body as { subscription_id: string };

    if (!subscription_id) {
      return NextResponse.json({ error: 'subscription_id is required' }, { status: 400 });
    }

    const removed = removeSubscription(subscription_id);
    if (!removed) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
