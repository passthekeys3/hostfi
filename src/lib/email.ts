// Postmark email sending utility

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  tag?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN;

  if (!serverToken) {
    console.log('[Email] No POSTMARK_SERVER_TOKEN — skipping email send');
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
        From: options.from ?? 'HostFi <hello@hostfi.ai>',
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
        Tag: options.tag,
        MessageStream: 'outbound',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Email] Postmark error:', response.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
}

// Pre-built email templates

export async function sendWelcomeEmail(to: string, name: string, inboundAddress: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Welcome to HostFi',
    tag: 'welcome',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px;">Welcome to HostFi, ${name}!</h1>

        <p style="font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 24px;">
          Your account is ready. Here's how to get started in 2 minutes:
        </p>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px;">Your Billing Email Address</p>
          <p style="font-size: 15px; font-family: monospace; color: #0D9488; margin-bottom: 12px;">${inboundAddress}</p>
          <p style="font-size: 13px; color: #6B7280; line-height: 1.5;">
            Forward utility bills to this address. HostFi will parse the vendor, amount, and due date automatically.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <p style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">Quick Start</p>
          <ol style="font-size: 14px; color: #6B7280; line-height: 1.8; padding-left: 20px;">
            <li>Add your first property in the dashboard</li>
            <li>Forward a utility bill to the email above</li>
            <li>Watch HostFi parse and categorize it automatically</li>
          </ol>
        </div>

        <a href="https://hostfi.ai/dashboard" style="display: inline-block; background: #111827; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Go to Dashboard
        </a>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #9CA3AF;">Questions? Just reply to this email. We read everything.</p>
        <p style="font-size: 12px; color: #9CA3AF;">hostfi.ai</p>
      </div>
    `,
  });
}

export async function sendWeeklySummary(to: string, name: string, summary: {
  totalExpenses: number;
  newBills: number;
  propertiesTracked: number;
  topCategory: string;
  alerts: number;
}): Promise<boolean> {
  return sendEmail({
    to,
    subject: `HostFi Weekly Summary — $${summary.totalExpenses.toLocaleString()} in expenses`,
    tag: 'weekly-summary',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px;">Weekly Summary</h1>
        <p style="font-size: 15px; color: #6B7280; margin-bottom: 24px;">Hey ${name}, here's your week at a glance.</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Total Expenses</p>
            <p style="font-size: 22px; font-weight: 700; color: #111827;">$${summary.totalExpenses.toLocaleString()}</p>
          </div>
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">New Bills Parsed</p>
            <p style="font-size: 22px; font-weight: 700; color: #111827;">${summary.newBills}</p>
          </div>
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Properties</p>
            <p style="font-size: 22px; font-weight: 700; color: #111827;">${summary.propertiesTracked}</p>
          </div>
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <p style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Alerts</p>
            <p style="font-size: 22px; font-weight: 700; color: ${summary.alerts > 0 ? '#DC2626' : '#111827'};">${summary.alerts}</p>
          </div>
        </div>

        <p style="font-size: 13px; color: #6B7280; margin-bottom: 24px;">Top spending category: <strong style="color: #111827;">${summary.topCategory}</strong></p>

        <a href="https://hostfi.ai/dashboard/analytics" style="display: inline-block; background: #111827; color: white; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          View Full Report
        </a>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #9CA3AF;">hostfi.ai</p>
      </div>
    `,
  });
}
