/**
 * Email templates for HostFi onboarding and transactional emails.
 * Sent via Postmark. All templates return { subject, htmlBody, textBody }.
 */

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
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
    <p style="font-size:12px;color:#9ca3af;margin:0;">HostFi Inc. &middot; <a href="https://hostfi.ai" style="color:#14b8a6;text-decoration:none;">hostfi.ai</a></p>
    <p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">
      <a href="https://hostfi.ai/privacy" style="color:#9ca3af;text-decoration:none;">Privacy</a> &middot;
      <a href="https://hostfi.ai/terms" style="color:#9ca3af;text-decoration:none;">Terms</a> &middot;
      <a href="https://hostfi.ai/dashboard/settings" style="color:#9ca3af;text-decoration:none;">Manage Preferences</a>
    </p>
  </div>
</div>
`;

const BUTTON = (text: string, url: string) => `
<a href="${url}" style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;margin:8px 0;">${text}</a>
`;

export function welcomeEmail(name: string): EmailTemplate {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: 'Welcome to HostFi',
    htmlBody: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Welcome to HostFi, ${firstName}</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
        You're all set. Here's how to get the most out of HostFi in the next 5 minutes:
      </p>
      <ol style="font-size:15px;line-height:1.8;color:#374151;padding-left:20px;margin:0 0 24px;">
        <li><strong>Add your first property</strong> with the address and type (owner or arbitrage)</li>
        <li><strong>Log an expense</strong> or scan a receipt with your phone camera</li>
        <li><strong>Check your dashboard</strong> to see expenses organized by property and category</li>
      </ol>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 24px;">
        Every expense you add is automatically mapped to the correct Schedule E line item. When tax time comes, just export your summary and hand it to your CPA.
      </p>
      ${BUTTON('Open Your Dashboard', 'https://hostfi.ai/dashboard')}
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">
        Questions? Just reply to this email. I read every one.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">
        Kevin, Founder of HostFi
      </p>
    ${FOOTER}`,
    textBody: `Welcome to HostFi, ${firstName}!

You're all set. Here's how to get the most out of HostFi in the next 5 minutes:

1. Add your first property with the address and type (owner or arbitrage)
2. Log an expense or scan a receipt with your phone camera
3. Check your dashboard to see expenses organized by property and category

Every expense you add is automatically mapped to the correct Schedule E line item. When tax time comes, just export your summary and hand it to your CPA.

Open your dashboard: https://hostfi.ai/dashboard

Questions? Just reply to this email. I read every one.

Kevin, Founder of HostFi`,
  };
}

export function tipsEmail(name: string): EmailTemplate {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: '3 things most operators miss (expense tracking tips)',
    htmlBody: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Hey ${firstName}, quick tips</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
        After talking to dozens of STR operators, these are the three expense tracking mistakes that cost people the most money:
      </p>
      
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 16px;">
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 8px;">1. Forgetting platform fees</p>
        <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.5;">
          Airbnb charges hosts ~3% per booking. On $50K in bookings, that's $1,500 in deductible expenses most people forget to claim. Log these as "Other" expenses in HostFi and they'll map to Schedule E Line 19.
        </p>
      </div>
      
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 16px;">
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 8px;">2. Mixing repairs and improvements</p>
        <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.5;">
          A repair (fixing a faucet) is fully deductible this year. An improvement (new kitchen) gets depreciated over 27.5 years. Categorize carefully. When in doubt, HostFi's AI will flag items that look like they might be improvements.
        </p>
      </div>
      
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 16px;">
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 8px;">3. Not scanning receipts immediately</p>
        <p style="font-size:14px;color:#4b5563;margin:0;line-height:1.5;">
          Paper fades, gets lost, goes through the wash. Snap a photo the moment you get a receipt. HostFi's receipt scanner reads the vendor, amount, and date automatically.
        </p>
      </div>
      
      ${BUTTON('Scan a Receipt Now', 'https://hostfi.ai/dashboard/expenses/new')}
      
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">
        More tips in our <a href="https://hostfi.ai/blog/str-expense-tracking" style="color:#14b8a6;text-decoration:none;">expense tracking guide</a>.
      </p>
    ${FOOTER}`,
    textBody: `Hey ${firstName}, quick tips

After talking to dozens of STR operators, these are the three expense tracking mistakes that cost people the most money:

1. Forgetting platform fees
Airbnb charges hosts ~3% per booking. On $50K in bookings, that's $1,500 in deductible expenses most people forget to claim.

2. Mixing repairs and improvements
A repair (fixing a faucet) is fully deductible this year. An improvement (new kitchen) gets depreciated over 27.5 years.

3. Not scanning receipts immediately
Paper fades, gets lost, goes through the wash. Snap a photo the moment you get a receipt.

Scan a receipt: https://hostfi.ai/dashboard/expenses/new

More tips: https://hostfi.ai/blog/str-expense-tracking`,
  };
}

export function checkInEmail(name: string, propertyCount: number, expenseCount: number): EmailTemplate {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: 'How\'s it going with HostFi?',
    htmlBody: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Hey ${firstName}</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
        You've been on HostFi for a few days now. Quick snapshot of where you're at:
      </p>
      
      <div style="display:flex;gap:16px;margin:0 0 24px;">
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:700;color:#111827;margin:0;">${propertyCount}</p>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Properties</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:28px;font-weight:700;color:#111827;margin:0;">${expenseCount}</p>
          <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">Expenses</p>
        </div>
      </div>
      
      ${propertyCount === 0 ? `
        <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
          Looks like you haven't added any properties yet. It takes about 30 seconds. Just need the address and whether you own it or rent it (arbitrage).
        </p>
        ${BUTTON('Add Your First Property', 'https://hostfi.ai/dashboard/properties/new')}
      ` : expenseCount === 0 ? `
        <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
          You've got ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'} set up but no expenses logged yet. Try scanning a receipt or adding a recent bill to see the dashboard come alive.
        </p>
        ${BUTTON('Add an Expense', 'https://hostfi.ai/dashboard/expenses/new')}
      ` : `
        <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px;">
          Nice work. You're tracking expenses across ${propertyCount} ${propertyCount === 1 ? 'property' : 'properties'}. Check your analytics to see spend trends and your tax prep page for a Schedule E preview.
        </p>
        ${BUTTON('View Analytics', 'https://hostfi.ai/dashboard/analytics')}
      `}
      
      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;">
        Have feedback or running into issues? Reply to this email, I'll get back to you personally.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Kevin</p>
    ${FOOTER}`,
    textBody: `Hey ${firstName},

You've been on HostFi for a few days. Quick snapshot:
- ${propertyCount} properties
- ${expenseCount} expenses tracked

${propertyCount === 0
  ? 'Add your first property (takes 30 seconds): https://hostfi.ai/dashboard/properties/new'
  : expenseCount === 0
    ? 'Try adding an expense or scanning a receipt: https://hostfi.ai/dashboard/expenses/new'
    : 'Check your analytics: https://hostfi.ai/dashboard/analytics'
}

Have feedback? Reply to this email.

Kevin`,
  };
}

export function weeklyDigestEmail(
  name: string,
  data: {
    totalSpend: number;
    expenseCount: number;
    topCategory: string;
    topCategoryAmount: number;
    anomalies: string[];
  }
): EmailTemplate {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: `Your weekly expense summary: $${data.totalSpend.toLocaleString()}`,
    htmlBody: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Weekly Summary</h1>
      <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 20px;">
        Here's what happened with your properties this week, ${firstName}:
      </p>
      
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:14px;color:#6b7280;">Total Spend</span>
          <span style="font-size:14px;font-weight:600;color:#111827;">$${data.totalSpend.toLocaleString()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:14px;color:#6b7280;">Expenses Logged</span>
          <span style="font-size:14px;font-weight:600;color:#111827;">${data.expenseCount}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:14px;color:#6b7280;">Top Category</span>
          <span style="font-size:14px;font-weight:600;color:#111827;">${data.topCategory} ($${data.topCategoryAmount.toLocaleString()})</span>
        </div>
      </div>
      
      ${data.anomalies.length > 0 ? `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:0 0 20px;">
          <p style="font-size:14px;font-weight:600;color:#991b1b;margin:0 0 8px;">Anomalies Detected</p>
          ${data.anomalies.map(a => `<p style="font-size:13px;color:#7f1d1d;margin:4px 0;">&bull; ${a}</p>`).join('')}
        </div>
      ` : ''}
      
      ${BUTTON('View Full Dashboard', 'https://hostfi.ai/dashboard')}
    ${FOOTER}`,
    textBody: `Weekly Summary for ${firstName}

Total Spend: $${data.totalSpend.toLocaleString()}
Expenses Logged: ${data.expenseCount}
Top Category: ${data.topCategory} ($${data.topCategoryAmount.toLocaleString()})
${data.anomalies.length > 0 ? `\nAnomalies:\n${data.anomalies.map(a => `- ${a}`).join('\n')}` : ''}

View dashboard: https://hostfi.ai/dashboard`,
  };
}

export function monthlyReportEmail(
  name: string,
  data: {
    month: string; // e.g. "January 2026"
    totalSpend: number;
    totalRevenue: number;
    netIncome: number;
    expenseCount: number;
    propertyCount: number;
    categoryBreakdown: { category: string; amount: number; percent: number }[];
    propertyBreakdown: { name: string; expenses: number; revenue: number; net: number }[];
    momChange: number | null; // percentage change vs last month
    anomalies: string[];
    topExpense: { description: string; amount: number; property: string } | null;
  }
): EmailTemplate {
  const firstName = name?.split(' ')[0] || 'there';
  const momText = data.momChange !== null 
    ? `${data.momChange >= 0 ? '+' : ''}${data.momChange.toFixed(1)}% vs last month`
    : 'First month tracked';
  const netColor = data.netIncome >= 0 ? '#059669' : '#dc2626';

  const categoryRows = data.categoryBreakdown.slice(0, 6).map(c => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${c.category}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">$${c.amount.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:12px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${c.percent.toFixed(0)}%</td>
    </tr>
  `).join('');

  const propertyRows = data.propertyBreakdown.map(p => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${p.name}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">$${p.expenses.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">$${p.revenue.toLocaleString()}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;color:${p.net >= 0 ? '#059669' : '#dc2626'};">$${p.net.toLocaleString()}</td>
    </tr>
  `).join('');

  return {
    subject: `${data.month} Property Report: $${data.totalSpend.toLocaleString()} spent across ${data.propertyCount} ${data.propertyCount === 1 ? 'property' : 'properties'}`,
    htmlBody: `${HEADER}
      <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">${data.month} Report</h1>
      <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">${momText}</p>

      <!-- Summary Cards -->
      <div style="display:flex;gap:12px;margin:0 0 24px;">
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Total Expenses</p>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">$${data.totalSpend.toLocaleString()}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Total Revenue</p>
          <p style="font-size:24px;font-weight:700;color:#111827;margin:0;">$${data.totalRevenue.toLocaleString()}</p>
        </div>
        <div style="flex:1;background:#f9fafb;border-radius:12px;padding:16px;text-align:center;">
          <p style="font-size:11px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Net Income</p>
          <p style="font-size:24px;font-weight:700;margin:0;color:${netColor};">$${data.netIncome.toLocaleString()}</p>
        </div>
      </div>

      <!-- Expense Breakdown -->
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Expense Breakdown</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Category</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Amount</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">%</th>
            </tr>
          </thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </div>

      ${data.propertyBreakdown.length > 0 ? `
      <!-- Property Breakdown -->
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">By Property</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:left;text-transform:uppercase;letter-spacing:0.5px;">Property</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Expenses</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Revenue</th>
              <th style="padding:0 0 8px;font-size:11px;color:#9ca3af;text-align:right;text-transform:uppercase;letter-spacing:0.5px;">Net</th>
            </tr>
          </thead>
          <tbody>${propertyRows}</tbody>
        </table>
      </div>
      ` : ''}

      ${data.anomalies.length > 0 ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#991b1b;margin:0 0 8px;">Anomalies Detected</p>
        ${data.anomalies.map(a => `<p style="font-size:13px;color:#7f1d1d;margin:4px 0;">&bull; ${a}</p>`).join('')}
      </div>
      ` : ''}

      ${data.topExpense ? `
      <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:16px;margin:0 0 20px;">
        <p style="font-size:14px;font-weight:600;color:#0f766e;margin:0 0 4px;">Largest Expense</p>
        <p style="font-size:13px;color:#115e59;margin:0;">${data.topExpense.description} — $${data.topExpense.amount.toLocaleString()} (${data.topExpense.property})</p>
      </div>
      ` : ''}

      ${BUTTON('View Full Report', 'https://hostfi.ai/dashboard/reports')}
      ${BUTTON('Download Tax Summary', 'https://hostfi.ai/dashboard/tax')}
    ${FOOTER}`,
    textBody: `${data.month} Property Report

Total Expenses: $${data.totalSpend.toLocaleString()}
Total Revenue: $${data.totalRevenue.toLocaleString()}
Net Income: $${data.netIncome.toLocaleString()}
${momText}

Expense Breakdown:
${data.categoryBreakdown.map(c => `- ${c.category}: $${c.amount.toLocaleString()} (${c.percent.toFixed(0)}%)`).join('\n')}

${data.propertyBreakdown.length > 0 ? `By Property:\n${data.propertyBreakdown.map(p => `- ${p.name}: Expenses $${p.expenses.toLocaleString()} | Revenue $${p.revenue.toLocaleString()} | Net $${p.net.toLocaleString()}`).join('\n')}` : ''}

${data.anomalies.length > 0 ? `Anomalies:\n${data.anomalies.map(a => `- ${a}`).join('\n')}` : ''}

View full report: https://hostfi.ai/dashboard/reports
Tax summary: https://hostfi.ai/dashboard/tax`,
  };
}
