import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleSlackFileUpload } from '@/lib/integrations/slack';

/**
 * POST /api/integrations/slack/events — Slack Events API endpoint
 * 
 * Handles:
 * 1. URL verification challenge (Slack sends this during app setup)
 * 2. file_shared events (receipt/invoice uploads)
 * 3. message events (slash command responses)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // 1. URL Verification (Slack sends this when you set up Events API)
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. Verify request signature
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Signing secret not configured' }, { status: 500 });
    }
    if (signingSecret) {
      const timestamp = request.headers.get('x-slack-request-timestamp');
      const signature = request.headers.get('x-slack-signature');

      if (!timestamp || !signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      // Reject requests older than 5 minutes (replay attack prevention)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - Number(timestamp)) > 300) {
        return NextResponse.json({ error: 'Request too old' }, { status: 401 });
      }

      const sigBasestring = `v0:${timestamp}:${rawBody}`;
      const expectedSignature = 'v0=' + crypto
        .createHmac('sha256', signingSecret)
        .update(sigBasestring)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // 3. Handle events
    if (body.type === 'event_callback') {
      const event = body.event;

      // Acknowledge immediately (Slack wants a 200 within 3 seconds)
      // Process asynchronously
      if (event.type === 'file_shared' || (event.type === 'message' && event.files?.length > 0)) {
        // Handle file upload — fire and forget (Slack retries if we don't respond fast)
        processFileEvent(event, body.team_id).catch(err =>
          console.error('Slack file processing error:', err)
        );
      }

      // Slack commands via message
      if (event.type === 'app_mention' || event.type === 'message') {
        const text = (event.text || '').toLowerCase().trim();
        
        if (text.includes('/hostfi spending') || text.includes('spending summary')) {
          processSpendingQuery(event, body.team_id).catch(err =>
            console.error('Slack spending query error:', err)
          );
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack events error:', error);
    // Always return 200 to Slack to prevent retries on parse errors
    return NextResponse.json({ ok: true });
  }
}

/**
 * Process a file upload event asynchronously
 */
async function processFileEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  // TODO: Look up bot token from Supabase by team_id
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    console.warn('SLACK_BOT_TOKEN not configured, skipping file processing');
    return;
  }

  // Handle both file_shared and message-with-files events
  const files = event.files as Array<Record<string, unknown>> | undefined;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleSlackFileUpload(botToken, {
      file: {
        id: file.id as string,
        name: file.name as string,
        mimetype: file.mimetype as string,
        url_private: file.url_private as string,
        size: file.size as number,
      },
      channel_id: (event.channel || event.channel_id) as string,
      ts: event.ts as string,
      user: event.user as string,
    });
  }
}

/**
 * Process a spending query from Slack
 */
async function processSpendingQuery(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) return;

  const { sendSlackMessage } = await import('@/lib/integrations/slack');

  // TODO: Query actual expense data from Supabase
  // For now, send a demo response
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Spending Summary', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'View your full spending breakdown in HostFi:',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open Analytics', emoji: true },
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/analytics`,
          action_id: 'open_analytics',
        },
      ],
    },
  ];

  await sendSlackMessage(
    botToken,
    event.channel as string,
    'Here\'s your spending summary',
    blocks,
    event.ts as string
  );
}
