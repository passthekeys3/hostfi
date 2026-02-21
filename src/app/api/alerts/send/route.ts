import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  anomalyAlertEmail,
  billDueEmail,
  billOverdueEmail,
  weeklyDigestEmail,
  monthlyReportEmail,
} from '@/lib/email-templates/alerts';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function sendViaPostmark(to: string, subject: string, html: string): Promise<boolean> {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;
  const fromEmail = process.env.POSTMARK_FROM_EMAIL || 'alerts@hostfi.ai';

  if (!serverToken) {
    console.warn('[Alerts] No POSTMARK_SERVER_TOKEN — skipping send');
    return false;
  }

  try {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': serverToken,
      },
      body: JSON.stringify({
        From: fromEmail,
        To: to,
        Subject: subject,
        HtmlBody: html,
        MessageStream: 'outbound',
        Tag: 'alert',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Alerts] Postmark error:', response.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Alerts] Send failed:', err);
    return false;
  }
}

type AlertType = 'anomaly' | 'bill_due' | 'bill_overdue' | 'weekly_digest' | 'monthly_report';

interface AlertTypeConfig {
  enabled: boolean;
  frequency?: string;
  day?: string;
  time?: string;
}

/**
 * POST /api/alerts/send
 * Internal endpoint to fire an alert. Protected by service key header.
 * Body: { user_id: string, alert_type: string, data: object }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal service key
    const internalKey = request.headers.get('X-HostFi-Internal');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey || internalKey !== serviceKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { user_id, alert_type, data } = body as {
      user_id: string;
      alert_type: AlertType;
      data: Record<string, unknown>;
    };

    if (!user_id || !alert_type || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch user's alert preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', user_id)
      .eq('active', true)
      .single();

    if (prefsError || !prefs) {
      // No preferences or inactive - don't send
      return NextResponse.json({ sent: false, reason: 'No active preferences' });
    }

    // Check if this alert type is enabled
    const alertTypes = prefs.alert_types as Record<string, AlertTypeConfig>;
    const alertConfig = alertTypes[alert_type];

    if (!alertConfig?.enabled) {
      return NextResponse.json({ sent: false, reason: 'Alert type disabled' });
    }

    // Generate email content based on alert type
    let emailContent: { subject: string; html: string } | null = null;

    switch (alert_type) {
      case 'anomaly':
        emailContent = anomalyAlertEmail(data as Parameters<typeof anomalyAlertEmail>[0]);
        break;
      case 'bill_due':
        emailContent = billDueEmail(data as Parameters<typeof billDueEmail>[0]);
        break;
      case 'bill_overdue':
        emailContent = billOverdueEmail(data as Parameters<typeof billOverdueEmail>[0]);
        break;
      case 'weekly_digest':
        emailContent = weeklyDigestEmail(data as Parameters<typeof weeklyDigestEmail>[0]);
        break;
      case 'monthly_report':
        emailContent = monthlyReportEmail(data as Parameters<typeof monthlyReportEmail>[0]);
        break;
      default:
        return NextResponse.json({ error: `Unknown alert type: ${alert_type}` }, { status: 400 });
    }

    if (!emailContent) {
      return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
    }

    // Send to all recipients
    const recipients = prefs.recipients as string[];
    const results = await Promise.all(
      recipients.map(recipient => sendViaPostmark(recipient, emailContent.subject, emailContent.html))
    );

    const successCount = results.filter(Boolean).length;

    return NextResponse.json({
      sent: true,
      recipients: recipients.length,
      successful: successCount,
    });
  } catch (error) {
    console.error('POST /api/alerts/send error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
