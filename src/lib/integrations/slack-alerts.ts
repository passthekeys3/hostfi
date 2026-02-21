/**
 * Slack Alert Integration
 * 
 * Sends alerts to Slack channels when users have Slack connected
 * and the relevant notification type enabled.
 */

import { createClient } from '@supabase/supabase-js';
import { sendSlackMessage, buildAlertBlocks, buildWeeklyDigestBlocks } from './slack';
import type { SlackConfig } from './types';

type AlertType = 'anomaly' | 'bill_due' | 'bill_overdue' | 'weekly_digest' | 'monthly_report';

// Map alert types to Slack notification settings
const ALERT_TO_NOTIFICATION: Record<AlertType, keyof SlackConfig['notifications']> = {
  anomaly: 'anomaly',
  bill_due: 'bill_due',
  bill_overdue: 'overdue',
  weekly_digest: 'weekly_digest',
  monthly_report: 'monthly_report',
};

/**
 * Send an alert to a user's Slack channel if they have it configured
 */
export async function sendSlackAlert(
  userId: string,
  alertType: AlertType,
  data: Record<string, unknown>
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('[sendSlackAlert] Supabase not configured');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get user's Slack connection
  const { data: connection, error } = await supabase
    .from('integration_connections')
    .select('access_token, metadata')
    .eq('user_id', userId)
    .eq('provider', 'slack')
    .eq('active', true)
    .single();

  if (error || !connection) {
    // User doesn't have Slack connected — silent return
    return;
  }

  const metadata = connection.metadata as SlackConfig | null;
  if (!metadata) {
    console.warn('[sendSlackAlert] No Slack metadata for user:', userId);
    return;
  }

  // Check if this notification type is enabled
  const notificationKey = ALERT_TO_NOTIFICATION[alertType];
  if (metadata.notifications && !metadata.notifications[notificationKey]) {
    // User has disabled this notification type
    return;
  }

  // Get the alert channel
  const channelId = metadata.alert_channel_id;
  if (!channelId) {
    console.warn('[sendSlackAlert] No alert channel configured for user:', userId);
    return;
  }

  // Build blocks based on alert type
  let blocks: Record<string, unknown>[];
  let text: string;

  switch (alertType) {
    case 'anomaly': {
      blocks = buildAlertBlocks('anomaly', {
        vendor: data.vendor,
        amount: data.amount,
        property: data.property,
        reason: `This expense ($${Number(data.amount || 0).toFixed(2)}) is ${Math.round(((Number(data.amount || 0) - Number(data.averageAmount || 0)) / Number(data.averageAmount || 1)) * 100)}% higher than your average of $${Number(data.averageAmount || 0).toFixed(2)}`,
      });
      text = `⚠️ Anomaly detected: ${data.vendor} — $${Number(data.amount || 0).toFixed(2)}`;
      break;
    }

    case 'bill_due': {
      blocks = buildAlertBlocks('due_soon', {
        vendor: data.vendor,
        amount: data.amount,
        property: data.property,
        due_date: data.dueDate,
      });
      text = `⏰ Bill due soon: ${data.vendor} — $${Number(data.amount || 0).toFixed(2)} due ${data.dueDate}`;
      break;
    }

    case 'bill_overdue': {
      blocks = buildAlertBlocks('overdue', {
        vendor: data.vendor,
        amount: data.amount,
        property: data.property,
        due_date: data.dueDate,
      });
      text = `🚨 Bill overdue: ${data.vendor} — $${Number(data.amount || 0).toFixed(2)} was due ${data.dueDate}`;
      break;
    }

    case 'weekly_digest': {
      const properties = data.properties as { name: string; amount: number }[] | undefined;
      const topProperty = properties?.sort((a, b) => b.amount - a.amount)[0]?.name || 'N/A';
      const topCategory = (data.topCategory as { name: string } | null)?.name || 'N/A';
      
      blocks = buildWeeklyDigestBlocks({
        total_spent: Number(data.totalSpend || 0),
        expense_count: Number(data.expenseCount || 0),
        top_category: topCategory,
        top_property: topProperty,
        anomalies: 0,
        period: `${data.weekStart} - ${data.weekEnd}`,
      });
      text = `📊 Weekly digest: $${Number(data.totalSpend || 0).toFixed(2)} across ${data.expenseCount} expenses`;
      break;
    }

    case 'monthly_report': {
      const categories = data.categories as { name: string; amount: number }[] | undefined;
      const topCat = categories?.sort((a, b) => b.amount - a.amount)[0]?.name || 'N/A';
      
      blocks = [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📅 Monthly Report', emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${data.month}*` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Total Expenses*\n$${Number(data.totalExpenses || 0).toFixed(2)}` },
            { type: 'mrkdwn', text: `*Total Revenue*\n$${Number(data.totalRevenue || 0).toFixed(2)}` },
            { type: 'mrkdwn', text: `*Net Income*\n$${Number(data.netIncome || 0).toFixed(2)}` },
            { type: 'mrkdwn', text: `*Top Category*\n${topCat}` },
          ],
        },
        ...(data.momChange != null
          ? [
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `${Number(data.momChange) >= 0 ? '📈' : '📉'} ${Math.abs(Number(data.momChange)).toFixed(1)}% ${Number(data.momChange) >= 0 ? 'increase' : 'decrease'} from last month`,
                  },
                ],
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
              action_id: 'view_monthly_report',
            },
          ],
        },
      ];
      text = `📅 Monthly report for ${data.month}: Net income $${Number(data.netIncome || 0).toFixed(2)}`;
      break;
    }

    default:
      return;
  }

  try {
    await sendSlackMessage(connection.access_token, channelId, text, blocks);
  } catch (err) {
    console.error('[sendSlackAlert] Failed to send Slack message:', err);
  }
}
