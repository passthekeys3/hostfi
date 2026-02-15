import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { sendSlackMessage } from '@/lib/integrations/slack';

/**
 * Get bot token and user info from Supabase by Slack team ID
 */
async function getConnectionByTeam(teamId: string): Promise<{ token: string; userId: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.warn('Supabase not configured for Slack token lookup');
    return null;
  }
  
  const supabase = createClient(supabaseUrl, serviceKey);
  
  const { data, error } = await supabase
    .from('integration_connections')
    .select('access_token, user_id')
    .eq('provider', 'slack')
    .eq('active', true)
    .filter('metadata->>team_id', 'eq', teamId)
    .single();
  
  if (error || !data) {
    console.warn('No Slack connection found for team:', teamId);
    return null;
  }
  
  return { token: data.access_token, userId: data.user_id };
}

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
    const teamId = payload.team?.id;

    switch (action.action_id) {
      case 'approve_receipt': {
        // Look up connection from Supabase
        const connection = teamId ? await getConnectionByTeam(teamId) : null;
        if (!connection) {
          console.warn('No Slack connection for approve_receipt');
          break;
        }

        // Parse the receipt data from the button value
        let receiptData: Record<string, unknown> = {};
        try {
          receiptData = JSON.parse(action.value || '{}');
        } catch { /* empty */ }

        // Save to Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && serviceKey) {
          const supabase = createClient(supabaseUrl, serviceKey);
          
          // Get user's first property as default
          const { data: properties } = await supabase
            .from('properties')
            .select('id')
            .eq('user_id', connection.userId)
            .limit(1);
          
          if (properties && properties.length > 0) {
            // Parse date or use today
            let expenseDate = receiptData.date as string | undefined;
            if (!expenseDate || !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
              expenseDate = new Date().toISOString().split('T')[0];
            }

            // Map category to valid enum value
            const validCategories = [
              'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage',
              'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other'
            ];
            const category = validCategories.includes(receiptData.category as string)
              ? receiptData.category as string
              : 'other';

            const { error: insertError } = await supabase
              .from('expenses')
              .insert({
                user_id: connection.userId,
                property_id: properties[0].id,
                vendor: receiptData.vendor || 'Unknown',
                amount: Number(receiptData.amount || 0),
                category,
                date: expenseDate,
                source: 'receipt_scan',
                status: 'paid',
                description: `Approved via Slack by user`,
              });

            if (insertError) {
              console.error('Failed to save expense:', insertError);
              await sendSlackMessage(
                connection.token,
                channel.id,
                `❌ Failed to save expense: ${insertError.message}`,
                undefined,
                message.ts
              );
              break;
            }

            await sendSlackMessage(
              connection.token,
              channel.id,
              `✅ Expense approved by <@${user.id}>: ${receiptData.vendor} — $${Number(receiptData.amount || 0).toFixed(2)}`,
              [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `✅ *Expense Saved to HostFi*\n*Vendor:* ${receiptData.vendor}\n*Amount:* $${Number(receiptData.amount || 0).toFixed(2)}\n*Category:* ${category}\n*Approved by:* <@${user.id}>`,
                  },
                },
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: 'View in HostFi', emoji: true },
                      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/expenses`,
                      action_id: 'view_expense',
                    },
                  ],
                },
              ],
              message.ts
            );
          } else {
            // No properties — can't save
            await sendSlackMessage(
              connection.token,
              channel.id,
              `⚠️ No properties found. Please add a property in HostFi first, then try again.`,
              [
                {
                  type: 'actions',
                  elements: [
                    {
                      type: 'button',
                      text: { type: 'plain_text', text: 'Add Property', emoji: true },
                      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/dashboard/properties`,
                      action_id: 'add_property',
                    },
                  ],
                },
              ],
              message.ts
            );
          }
        }
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
        const connection = teamId ? await getConnectionByTeam(teamId) : null;
        if (!connection) break;

        await sendSlackMessage(
          connection.token,
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
