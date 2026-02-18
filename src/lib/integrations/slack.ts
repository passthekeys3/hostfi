import type { SlackConfig } from './types';
import { parseReceipt, getDemoReceipt, type ParsedReceipt } from '@/lib/receipt-parser';

// Slack OAuth configuration
const SLACK_SCOPES = [
  'chat:write',
  'channels:read',
  'channels:history',
  'files:read',
  'commands',
  'reactions:write',
].join(',');

/**
 * Generate Slack OAuth authorization URL
 */
export function getSlackAuthUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) throw new Error('SLACK_CLIENT_ID not configured');
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL not configured');

  const redirectUri = `${appUrl}/api/integrations/slack/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: SLACK_SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params}`;
}

/**
 * Exchange Slack authorization code for bot token
 */
export async function exchangeSlackCode(code: string): Promise<{
  access_token: string;
  team: { id: string; name: string };
  bot_user_id: string;
}> {
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
    }),
  });

  if (!res.ok) throw new Error('Slack token exchange failed');
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack error: ${data.error}`);

  return {
    access_token: data.access_token,
    team: data.team,
    bot_user_id: data.bot_user_id,
  };
}

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  blocks?: Record<string, unknown>[],
  threadTs?: string
): Promise<{ ts: string; channel: string }> {
  const body: Record<string, unknown> = { channel, text };
  if (blocks) body.blocks = blocks;
  if (threadTs) body.thread_ts = threadTs;

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack send failed: ${data.error}`);
  return { ts: data.ts, channel: data.channel };
}

/**
 * Download a file from Slack (for receipt parsing)
 */
export async function downloadSlackFile(
  botToken: string,
  fileUrl: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${botToken}` },
  });

  if (!res.ok) throw new Error('Failed to download Slack file');

  const mimeType = res.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

/**
 * Handle a file shared event from Slack — parse receipt and reply
 */
export async function handleSlackFileUpload(
  botToken: string,
  event: {
    file: {
      id: string;
      name: string;
      mimetype: string;
      url_private: string;
      size: number;
    };
    channel_id: string;
    ts: string;
    user: string;
  }
): Promise<ParsedReceipt | null> {
  const { file, channel_id, ts } = event;

  // Only process images and PDFs
  const supportedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'];
  if (!supportedTypes.includes(file.mimetype)) {
    return null;
  }

  // Max 10MB
  if (file.size > 10_485_760) {
    await sendSlackMessage(
      botToken,
      channel_id,
      '⚠️ File too large (max 10MB). Please upload a smaller image.',
      undefined,
      ts
    );
    return null;
  }

  // React with eyes to show we're processing
  await addSlackReaction(botToken, channel_id, ts, 'eyes');

  try {
    // Download the file
    const { buffer, mimeType } = await downloadSlackFile(botToken, file.url_private);
    const base64 = buffer.toString('base64');

    // Parse with our existing receipt parser
    const parsed = await parseReceipt(base64, mimeType);

    // Remove eyes, add checkmark
    await removeSlackReaction(botToken, channel_id, ts, 'eyes');
    await addSlackReaction(botToken, channel_id, ts, 'white_check_mark');

    // Reply in thread with parsed details
    const blocks = buildReceiptResponseBlocks(parsed, file.name);
    await sendSlackMessage(
      botToken,
      channel_id,
      `Parsed receipt: ${parsed.vendor_name} — $${parsed.amount.toFixed(2)}`,
      blocks,
      ts
    );

    return parsed;
  } catch (error) {
    await removeSlackReaction(botToken, channel_id, ts, 'eyes');
    await addSlackReaction(botToken, channel_id, ts, 'x');

    const msg = error instanceof Error ? error.message : 'Unknown error';
    await sendSlackMessage(
      botToken,
      channel_id,
      `❌ Failed to parse receipt: ${msg}`,
      undefined,
      ts
    );
    return null;
  }
}

/**
 * Add an emoji reaction to a Slack message
 */
async function addSlackReaction(
  botToken: string,
  channel: string,
  timestamp: string,
  emoji: string
): Promise<void> {
  await fetch('https://slack.com/api/reactions.add', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, timestamp, name: emoji }),
  });
}

/**
 * Remove an emoji reaction from a Slack message
 */
async function removeSlackReaction(
  botToken: string,
  channel: string,
  timestamp: string,
  emoji: string
): Promise<void> {
  await fetch('https://slack.com/api/reactions.remove', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, timestamp, name: emoji }),
  });
}

/**
 * Build Slack Block Kit blocks for a parsed receipt response
 */
function buildReceiptResponseBlocks(
  receipt: ParsedReceipt,
  fileName: string
): Record<string, unknown>[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🧾 Receipt Parsed', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Vendor*\n${receipt.vendor_name}` },
        { type: 'mrkdwn', text: `*Amount*\n$${receipt.amount.toFixed(2)}` },
        { type: 'mrkdwn', text: `*Date*\n${receipt.date || 'Not detected'}` },
        { type: 'mrkdwn', text: `*Category*\n${receipt.category_suggestion}` },
      ],
    },
    ...(receipt.items.length > 0
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Items*\n${receipt.items
                .slice(0, 5)
                .map(i => `• ${i.description} — $${i.amount.toFixed(2)}`)
                .join('\n')}${receipt.items.length > 5 ? `\n_+${receipt.items.length - 5} more_` : ''}`,
            },
          },
        ]
      : []),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📎 ${fileName} · Confidence: ${Math.round(receipt.confidence * 100)}%`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Approve', emoji: true },
          style: 'primary',
          action_id: 'approve_receipt',
          value: JSON.stringify({
            vendor: receipt.vendor_name,
            amount: receipt.amount,
            category: receipt.category_suggestion,
            date: receipt.date,
          }),
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '✏️ Edit', emoji: true },
          action_id: 'edit_receipt',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🗑️ Discard', emoji: true },
          style: 'danger',
          action_id: 'discard_receipt',
        },
      ],
    },
  ];
}

/**
 * Build Slack blocks for an expense alert
 */
export function buildAlertBlocks(
  type: 'due_soon' | 'overdue' | 'anomaly' | 'new_bill',
  data: Record<string, unknown>
): Record<string, unknown>[] {
  const headers: Record<string, string> = {
    due_soon: '⏰ Bill Due Soon',
    overdue: '🚨 Overdue Bill',
    anomaly: '⚠️ Anomaly Detected',
    new_bill: '📬 New Bill Parsed',
  };

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: headers[type], emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Vendor*\n${data.vendor || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Amount*\n$${Number(data.amount || 0).toFixed(2)}` },
        ...(data.property ? [{ type: 'mrkdwn', text: `*Property*\n${data.property}` }] : []),
        ...(data.due_date ? [{ type: 'mrkdwn', text: `*Due Date*\n${data.due_date}` }] : []),
      ],
    },
    ...(data.reason
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Reason:* ${data.reason}` },
          },
        ]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in HostFi', emoji: true },
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/expenses`,
          action_id: 'view_in_app',
        },
      ],
    },
  ];
}

/**
 * Build Slack blocks for a weekly digest
 */
export function buildWeeklyDigestBlocks(data: {
  total_spent: number;
  expense_count: number;
  top_category: string;
  top_property: string;
  anomalies: number;
  period: string;
}): Record<string, unknown>[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '📊 Weekly Spending Digest', emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${data.period}*` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Total Spent*\n$${data.total_spent.toFixed(2)}` },
        { type: 'mrkdwn', text: `*Expenses*\n${data.expense_count}` },
        { type: 'mrkdwn', text: `*Top Category*\n${data.top_category}` },
        { type: 'mrkdwn', text: `*Top Property*\n${data.top_property}` },
      ],
    },
    ...(data.anomalies > 0
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *${data.anomalies} anomal${data.anomalies === 1 ? 'y' : 'ies'} detected this week* — review in HostFi`,
            },
          },
        ]
      : []),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Full Report', emoji: true },
          url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/analytics`,
          action_id: 'view_report',
        },
      ],
    },
  ];
}
