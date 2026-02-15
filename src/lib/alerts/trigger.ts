/**
 * Alert trigger helper
 * Call this from anywhere in the app to fire an alert (non-blocking)
 */

import { sendSlackAlert } from '@/lib/integrations/slack-alerts';

type AlertType = 'anomaly' | 'bill_due' | 'bill_overdue' | 'weekly_digest' | 'monthly_report';

/**
 * Trigger an alert for a user. This calls the internal /api/alerts/send endpoint.
 * The call is fire-and-forget (non-blocking).
 * 
 * @param userId - The user ID to send the alert for
 * @param alertType - The type of alert to send
 * @param data - The data to include in the alert (varies by alert type)
 */
export async function triggerAlert(
  userId: string,
  alertType: AlertType,
  data: Record<string, unknown>
): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.log('[triggerAlert] No service key configured — skipping');
    return;
  }

  // Determine base URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000';

  // Fire and forget - don't await
  // 1. Send email alert via API
  fetch(`${baseUrl}/api/alerts/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-HostFi-Internal': serviceKey,
    },
    body: JSON.stringify({
      user_id: userId,
      alert_type: alertType,
      data,
    }),
  }).catch(err => {
    console.error('[triggerAlert] Failed to send email alert:', err);
  });

  // 2. Send Slack alert (fire and forget)
  sendSlackAlert(userId, alertType, data).catch(err => {
    console.error('[triggerAlert] Failed to send Slack alert:', err);
  });
}

/**
 * Trigger anomaly alert for an unusual expense
 */
export function triggerAnomalyAlert(
  userId: string,
  data: {
    amount: number;
    vendor: string;
    property: string;
    category: string;
    averageAmount: number;
    date: string;
  }
): void {
  triggerAlert(userId, 'anomaly', data);
}

/**
 * Trigger bill due reminder
 */
export function triggerBillDueAlert(
  userId: string,
  data: {
    vendor: string;
    amount: number;
    property: string;
    dueDate: string;
    daysUntilDue: number;
  }
): void {
  triggerAlert(userId, 'bill_due', data);
}

/**
 * Trigger bill overdue alert
 */
export function triggerBillOverdueAlert(
  userId: string,
  data: {
    vendor: string;
    amount: number;
    property: string;
    dueDate: string;
    daysOverdue: number;
  }
): void {
  triggerAlert(userId, 'bill_overdue', data);
}

/**
 * Trigger weekly digest
 */
export function triggerWeeklyDigest(
  userId: string,
  data: {
    weekStart: string;
    weekEnd: string;
    totalSpend: number;
    expenseCount: number;
    properties: { name: string; amount: number }[];
    topCategory: { name: string; amount: number } | null;
  }
): void {
  triggerAlert(userId, 'weekly_digest', data);
}

/**
 * Trigger monthly report
 */
export function triggerMonthlyReport(
  userId: string,
  data: {
    month: string;
    totalExpenses: number;
    totalRevenue: number;
    netIncome: number;
    expenseCount: number;
    properties: { name: string; expenses: number; revenue: number; net: number }[];
    categories: { name: string; amount: number; percent: number }[];
    momChange: number | null;
  }
): void {
  triggerAlert(userId, 'monthly_report', data);
}
