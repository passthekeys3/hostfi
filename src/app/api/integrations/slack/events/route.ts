import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { handleSlackFileUpload, buildWeeklyDigestBlocks, sendSlackMessage } from '@/lib/integrations/slack';
import { readCredentials } from '@/lib/crypto';

/**
 * Get bot token from Supabase by Slack team ID
 */
async function getBotTokenByTeam(teamId: string): Promise<{ token: string; userId: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase not configured for Slack token lookup');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await supabase
    .from('integration_connections')
    .select('access_token, credentials, user_id')
    .eq('provider', 'slack')
    .eq('active', true)
    .filter('metadata->>team_id', 'eq', teamId)
    .single();
  
  if (error || !data) {
    console.warn('No Slack connection found for team:', teamId);
    return null;
  }
  
  const creds = readCredentials(data.credentials);
  const token = creds?.access_token || data.access_token;
  return { token, userId: data.user_id };
}

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
  const connection = await getBotTokenByTeam(teamId);
  if (!connection) {
    console.warn('No Slack connection found for team:', teamId);
    return;
  }

  // Handle both file_shared and message-with-files events
  const files = event.files as Array<Record<string, unknown>> | undefined;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleSlackFileUpload(connection.token, {
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
  const connection = await getBotTokenByTeam(teamId);
  if (!connection) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase not configured for spending query');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get last 7 days of expenses
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const today = new Date();
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('amount, category, property_id, properties(name)')
    .eq('user_id', connection.userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .lte('date', today.toISOString().split('T')[0]);

  if (error) {
    console.error('Failed to fetch expenses:', error);
    await sendSlackMessage(
      connection.token,
      event.channel as string,
      '❌ Failed to fetch spending data. Please try again.',
      undefined,
      event.ts as string
    );
    return;
  }

  // Calculate summary
  const totalSpent = expenses?.reduce((sum, e) => sum + Number(e.amount || 0), 0) || 0;
  const expenseCount = expenses?.length || 0;

  // Get top category
  const categoryTotals: Record<string, number> = {};
  expenses?.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount || 0);
  });
  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  // Get top property
  const propertyTotals: Record<string, number> = {};
  expenses?.forEach(e => {
    const propName = (e.properties as { name?: string } | null)?.name || 'Unknown';
    propertyTotals[propName] = (propertyTotals[propName] || 0) + Number(e.amount || 0);
  });
  const topProperty = Object.entries(propertyTotals)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  // Format date range
  const period = `${sevenDaysAgo.toLocaleDateString()} - ${today.toLocaleDateString()}`;

  const blocks = buildWeeklyDigestBlocks({
    total_spent: totalSpent,
    expense_count: expenseCount,
    top_category: topCategory,
    top_property: topProperty,
    anomalies: await (async () => {
      const { count } = await supabase
        .from('anomaly_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', connection.userId)
        .gte('created_at', sevenDaysAgo.toISOString());
      return count || 0;
    })(),
    period,
  });

  await sendSlackMessage(
    connection.token,
    event.channel as string,
    `📊 Spending Summary: $${totalSpent.toFixed(2)} across ${expenseCount} expenses`,
    blocks,
    event.ts as string
  );
}
