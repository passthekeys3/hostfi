import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendSlackMessage } from '@/lib/integrations/slack';

function verifySlackSignature(body: string, timestamp: string | null, signature: string | null): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    // In production, reject if no signing secret configured
    return process.env.NODE_ENV !== 'production';
  }
  if (!timestamp || !signature) return false;
  
  // Reject requests older than 5 minutes (replay attack prevention)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;
  
  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * POST /api/integrations/slack/interactions — Slack interactive component handler
 * 
 * Handles button clicks from Slack messages:
 * - approve_receipt: Add parsed receipt as an expense
 * - edit_receipt: Open HostFi to edit the expense
 * - discard_receipt: Delete the parsed expense
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    
    // Verify Slack signature
    const timestamp = request.headers.get('x-slack-request-timestamp');
    const signature = request.headers.get('x-slack-signature');
    if (!verifySlackSignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Parse form data from raw body
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get('payload');
    // Slack sends interactions as form-encoded with a "payload" field
    // const formData = await request.formData();
    if (!payloadStr) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const payload = JSON.parse(payloadStr);
    const { type, actions, channel, message, user } = payload;

    if (type !== 'block_actions' || !actions?.length) {
      return NextResponse.json({ ok: true });
    }

    const action = actions[0];
    const botToken = process.env.SLACK_BOT_TOKEN;

    switch (action.action_id) {
      case 'approve_receipt': {
        if (!botToken) break;

        // Parse the receipt data from the button value
        let receiptData: Record<string, unknown> = {};
        try {
          receiptData = JSON.parse(action.value || '{}');
        } catch { /* empty */ }

        // TODO: Actually save to Supabase expenses table
        // For now, confirm in Slack
        await sendSlackMessage(
          botToken,
          channel.id,
          `✅ Expense approved by <@${user.id}>: ${receiptData.vendor} — $${Number(receiptData.amount || 0).toFixed(2)}`,
          [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Expense Approved*\n*Vendor:* ${receiptData.vendor}\n*Amount:* $${Number(receiptData.amount || 0).toFixed(2)}\n*Category:* ${receiptData.category}\n*Approved by:* <@${user.id}>`,
              },
            },
          ],
          message.ts
        );
        break;
      }

      case 'edit_receipt': {
        // Redirect to HostFi dashboard
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `Open HostFi to edit: ${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/expenses`,
        });
      }

      case 'discard_receipt': {
        if (!botToken) break;

        await sendSlackMessage(
          botToken,
          channel.id,
          `🗑️ Receipt discarded by <@${user.id}>`,
          undefined,
          message.ts
        );
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack interactions error:', error);
    return NextResponse.json({ ok: true });
  }
}
