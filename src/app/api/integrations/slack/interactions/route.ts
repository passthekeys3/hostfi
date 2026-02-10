import { NextRequest, NextResponse } from 'next/server';
import { sendSlackMessage } from '@/lib/integrations/slack';

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
    // Slack sends interactions as form-encoded with a "payload" field
    const formData = await request.formData();
    const payloadStr = formData.get('payload') as string;
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
