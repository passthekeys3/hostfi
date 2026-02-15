/**
 * Email templates for HostFi alerts.
 * All templates return { subject, html } for use with Postmark.
 */

interface EmailTemplate {
  subject: string;
  html: string;
}

const HEADER = `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="padding:32px 0 24px;">
    <span style="display:inline-block;width:32px;height:32px;background:#14b8a6;border-radius:8px;text-align:center;line-height:32px;color:white;font-weight:bold;font-size:16px;">H</span>
    <span style="font-size:18px;font-weight:700;color:#111827;margin-left:8px;vertical-align:middle;">HostFi</span>
  </div>
`;

const FOOTER = `
  <div style="border-top:1px solid #f3f4f6;padding:24px 0 16px;margin-top:32px;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">
      <a href="https://hostfi.ai/dashboard/integrations" style="color:#14b8a6;text-decoration:none;">Manage alert preferences</a>
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">HostFi Inc. &middot; <a href="https://hostfi.ai" style="color:#14b8a6;text-decoration:none;">hostfi.ai</a></p>
  </div>
</div>
`;

const BUTTON = (text: string, url: string) => `
<a href="${url}" style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;margin:8px 0;">${text}</a>
`;

/**
 * Anomaly alert — unusual charge detected
 */
export function anomalyAlertEmail(data: {
  amount: number;
  vendor: string;
  property: string;
  category: string;
  averageAmount: number;
  date: string;
}): EmailTemplate {
  const percentHigher = Math.round(((data.amount - data.averageAmount) / data.averageAmount) * 100);
  
  return {
    subject: `Unusual charge detected: $${data.amount.toLocaleString()} at ${data.vendor}`,
    html: `${HEADER}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#991b1b;margin:0 0 4px;">⚠️ Unusual Charge Detected</p>
        <p style="font-size:13px;color:#7f1d1d;margin:0;">
          This expense is ${percentHigher}% higher than your average for ${data.category}.
        </p>
      </div>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <div style="margin-bottom:12px;">
          <span style="font-size:12px;color:#6b7280;">Amount</span>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:4px 0 0;">$${data.amount.toLocaleString()}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Vendor</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.vendor}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Property</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.property}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Category</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.category}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#6b7280;">Date</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.date}</span>
        </div>
      </div>

      <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
        Your average ${data.category} expense is $${data.averageAmount.toLocaleString()}. This one is significantly higher.
      </p>

      ${BUTTON('Review Expense', 'https://hostfi.ai/dashboard/expenses')}
    ${FOOTER}`,
  };
}

/**
 * Bill due reminder
 */
export function billDueEmail(data: {
  vendor: string;
  amount: number;
  property: string;
  dueDate: string;
  daysUntilDue: number;
}): EmailTemplate {
  return {
    subject: `${data.vendor} bill of $${data.amount.toLocaleString()} due in ${data.daysUntilDue} days`,
    html: `${HEADER}
      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#92400e;margin:0 0 4px;">📅 Bill Due Soon</p>
        <p style="font-size:13px;color:#78350f;margin:0;">
          Due in ${data.daysUntilDue} day${data.daysUntilDue !== 1 ? 's' : ''} — ${data.dueDate}
        </p>
      </div>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <div style="margin-bottom:12px;">
          <span style="font-size:12px;color:#6b7280;">Amount Due</span>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:4px 0 0;">$${data.amount.toLocaleString()}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Vendor</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.vendor}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#6b7280;">Property</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.property}</span>
        </div>
      </div>

      ${BUTTON('View All Bills', 'https://hostfi.ai/dashboard/expenses')}
    ${FOOTER}`,
  };
}

/**
 * Bill overdue alert
 */
export function billOverdueEmail(data: {
  vendor: string;
  amount: number;
  property: string;
  dueDate: string;
  daysOverdue: number;
}): EmailTemplate {
  return {
    subject: `OVERDUE: ${data.vendor} bill of $${data.amount.toLocaleString()} for ${data.property}`,
    html: `${HEADER}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#991b1b;margin:0 0 4px;">🚨 Bill Overdue</p>
        <p style="font-size:13px;color:#7f1d1d;margin:0;">
          ${data.daysOverdue} day${data.daysOverdue !== 1 ? 's' : ''} past due (was due ${data.dueDate})
        </p>
      </div>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <div style="margin-bottom:12px;">
          <span style="font-size:12px;color:#6b7280;">Amount Due</span>
          <p style="font-size:24px;font-weight:700;color:#dc2626;margin:4px 0 0;">$${data.amount.toLocaleString()}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="font-size:13px;color:#6b7280;">Vendor</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.vendor}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:#6b7280;">Property</span>
          <span style="font-size:13px;font-weight:600;color:#111827;">${data.property}</span>
        </div>
      </div>

      ${BUTTON('Pay Now', 'https://hostfi.ai/dashboard/expenses')}
    ${FOOTER}`,
  };
}

/**
 * Weekly digest
 */
export function weeklyDigestEmail(data: {
  weekStart: string;
  weekEnd: string;
  totalSpend: number;
  expenseCount: number;
  properties: { name: string; amount: number }[];
  topCategory: { name: string; amount: number } | null;
}): EmailTemplate {
  const propertyRows = data.properties.map(p => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">$${p.amount.toLocaleString()}</td>
    </tr>
  `).join('');

  return {
    subject: `Weekly Summary: $${data.totalSpend.toLocaleString()} spent (${data.weekStart} – ${data.weekEnd})`,
    html: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">Weekly Expense Summary</h1>
      <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${data.weekStart} – ${data.weekEnd}</p>

      <div style="display:flex;gap:12px;margin:0 0 24px;">
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;">Total Spent</p>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">$${data.totalSpend.toLocaleString()}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;">Expenses</p>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">${data.expenseCount}</p>
        </div>
      </div>

      ${data.properties.length > 0 ? `
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">By Property</p>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${propertyRows}</tbody>
        </table>
      </div>
      ` : ''}

      ${data.topCategory ? `
      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
        Top category: <strong style="color:#111827;">${data.topCategory.name}</strong> ($${data.topCategory.amount.toLocaleString()})
      </p>
      ` : ''}

      ${BUTTON('View Dashboard', 'https://hostfi.ai/dashboard')}
    ${FOOTER}`,
  };
}

/**
 * Monthly P&L report
 */
export function monthlyReportEmail(data: {
  month: string;
  totalExpenses: number;
  totalRevenue: number;
  netIncome: number;
  expenseCount: number;
  properties: { name: string; expenses: number; revenue: number; net: number }[];
  categories: { name: string; amount: number; percent: number }[];
  momChange: number | null;
}): EmailTemplate {
  const netColor = data.netIncome >= 0 ? '#059669' : '#dc2626';
  const momText = data.momChange !== null 
    ? `${data.momChange >= 0 ? '+' : ''}${data.momChange.toFixed(1)}% vs last month`
    : '';

  const propertyRows = data.properties.map(p => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">$${p.expenses.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">$${p.revenue.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;color:${p.net >= 0 ? '#059669' : '#dc2626'};">$${p.net.toLocaleString()}</td>
    </tr>
  `).join('');

  const categoryRows = data.categories.slice(0, 6).map(c => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${c.name}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">$${c.amount.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${c.percent.toFixed(0)}%</td>
    </tr>
  `).join('');

  return {
    subject: `${data.month} Report: $${data.netIncome >= 0 ? '+' : ''}${data.netIncome.toLocaleString()} net income`,
    html: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">${data.month} P&L Report</h1>
      ${momText ? `<p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${momText}</p>` : '<div style="margin-bottom:24px;"></div>'}

      <div style="display:flex;gap:12px;margin:0 0 24px;">
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;">Expenses</p>
          <p style="font-size:20px;font-weight:700;color:#111827;margin:0;">$${data.totalExpenses.toLocaleString()}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;">Revenue</p>
          <p style="font-size:20px;font-weight:700;color:#111827;margin:0;">$${data.totalRevenue.toLocaleString()}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;">Net Income</p>
          <p style="font-size:20px;font-weight:700;margin:0;color:${netColor};">$${data.netIncome.toLocaleString()}</p>
        </div>
      </div>

      ${data.categories.length > 0 ? `
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Expense Breakdown</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:left;text-transform:uppercase;">Category</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;">Amount</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;">%</th>
            </tr>
          </thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </div>
      ` : ''}

      ${data.properties.length > 0 ? `
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">By Property</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:left;text-transform:uppercase;">Property</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;">Expenses</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;">Revenue</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;">Net</th>
            </tr>
          </thead>
          <tbody>${propertyRows}</tbody>
        </table>
      </div>
      ` : ''}

      ${BUTTON('View Full Report', 'https://hostfi.ai/dashboard/reports')}
      ${BUTTON('Download Tax Summary', 'https://hostfi.ai/dashboard/tax')}
    ${FOOTER}`,
  };
}
