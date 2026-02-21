import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { sendSlackMessage, buildWeeklyDigestBlocks, buildAlertBlocks } from '@/lib/integrations/slack';
import { readCredentials } from '@/lib/crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Supabase = SupabaseClient<any>;

/**
 * Verify Slack request signature
 */
function verifySignature(body: string, timestamp: string | null, signature: string | null): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return process.env.NODE_ENV !== 'production';
  if (!timestamp || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const expected = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Get Slack connection by team ID
 */
async function getConnection(teamId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = await supabase
    .from('integration_connections')
    .select('access_token, credentials, user_id')
    .eq('provider', 'slack')
    .eq('active', true)
    .filter('metadata->>team_id', 'eq', teamId)
    .single();

  if (!data) return null;
  const creds = readCredentials(data.credentials);
  const token = creds?.access_token || data.access_token;
  return { token, userId: data.user_id };
}

/**
 * POST /api/integrations/slack/commands — Handle /hostfi slash command
 *
 * Usage:
 *   /hostfi                → Quick spending summary
 *   /hostfi spending       → This week's spending breakdown
 *   /hostfi properties     → List properties
 *   /hostfi help           → Show available commands
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify signature
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');
    if (!verifySignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const params = new URLSearchParams(rawBody);
    const subcommand = (params.get('text') || '').trim().toLowerCase();
    const teamId = params.get('team_id') || '';
    const channelId = params.get('channel_id') || '';
    const slackUserId = params.get('user_id') || '';

    const connection = await getConnection(teamId);
    if (!connection) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: '❌ HostFi is not connected to this workspace. Connect Slack from your HostFi dashboard → Integrations.',
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Route subcommands
    switch (subcommand) {
      case '':
      case 'spending': {
        return await handleSpending(supabase, connection, channelId, slackUserId);
      }
      case 'properties': {
        return await handleProperties(supabase, connection);
      }
      case 'alerts': {
        return await handleAlerts(supabase, connection);
      }
      case 'help':
      default: {
        return NextResponse.json({
          response_type: 'ephemeral',
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🏠 HostFi Commands', emoji: true },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: [
                  '`/hostfi` — Quick spending summary (last 7 days)',
                  '`/hostfi spending` — Detailed spending breakdown',
                  '`/hostfi properties` — List your properties',
                  '`/hostfi alerts` — Recent anomalies & alerts',
                  '`/hostfi help` — Show this menu',
                ].join('\n'),
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `💡 You can also upload receipts to any channel — HostFi will parse them automatically.`,
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Open HostFi Dashboard', emoji: true },
                  url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard`,
                  action_id: 'open_dashboard',
                },
              ],
            },
          ],
        });
      }
    }
  } catch (error) {
    console.error('Slack command error:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '❌ Something went wrong. Please try again.',
    });
  }
}

/**
 * /hostfi spending — Last 7 days summary
 */
async function handleSpending(
  supabase: Supabase,
  connection: { token: string; userId: string },
  channelId: string,
  slackUserId: string
) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const today = new Date();

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category, property_id, properties(name)')
    .eq('user_id', connection.userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0]);

  const totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
  const expenseCount = expenses?.length || 0;

  // Top category
  const catTotals: Record<string, number> = {};
  expenses?.forEach(e => {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount || 0);
  });
  const topCategory = Object.entries(catTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  // Top property
  const propTotals: Record<string, number> = {};
  expenses?.forEach(e => {
    const name = (e.properties as { name?: string } | null)?.name || 'Unknown';
    propTotals[name] = (propTotals[name] || 0) + Number(e.amount || 0);
  });
  const topProperty = Object.entries(propTotals).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  const period = `${sevenDaysAgo.toLocaleDateString()} – ${today.toLocaleDateString()}`;

  return NextResponse.json({
    response_type: 'in_channel',
    blocks: buildWeeklyDigestBlocks({
      total_spent: totalSpent,
      expense_count: expenseCount,
      top_category: topCategory,
      top_property: topProperty,
      anomalies: 0,
      period,
    }),
  });
}

/**
 * /hostfi properties — List user's properties
 */
async function handleProperties(
  supabase: Supabase,
  connection: { token: string; userId: string }
) {
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, address')
    .eq('user_id', connection.userId)
    .order('name');

  if (!properties || properties.length === 0) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'No properties found. Add one in HostFi first!',
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: "You don't have any properties yet." },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '➕ Add Property', emoji: true },
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/properties`,
              action_id: 'add_property',
            },
          ],
        },
      ],
    });
  }

  const propList = properties
    .map((p, i) => `${i + 1}. *${p.name}*${p.address ? `\n    📍 ${p.address}` : ''}`)
    .join('\n');

  return NextResponse.json({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🏠 Your Properties (${properties.length})`, emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: propList },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Manage Properties', emoji: true },
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/properties`,
            action_id: 'manage_properties',
          },
        ],
      },
    ],
  });
}

/**
 * /hostfi alerts — Recent anomalies
 */
async function handleAlerts(
  supabase: Supabase,
  connection: { token: string; userId: string }
) {
  // Check for recent expenses with anomaly flags or high amounts
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: expenses } = await supabase
    .from('expenses')
    .select('vendor, amount, category, date, property_id, properties(name)')
    .eq('user_id', connection.userId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('amount', { ascending: false })
    .limit(5);

  if (!expenses || expenses.length === 0) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: '✅ No notable expenses in the last 30 days.',
    });
  }

  const lines = expenses.map(e => {
    const prop = (e.properties as { name?: string } | null)?.name || 'Unknown';
    return `• *${e.vendor}* — $${Number(e.amount).toFixed(2)} (${e.category}) · ${prop} · ${e.date}`;
  });

  return NextResponse.json({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📋 Top Expenses (Last 30 Days)', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View All in HostFi', emoji: true },
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/expenses`,
            action_id: 'view_expenses',
          },
        ],
      },
    ],
  });
}
