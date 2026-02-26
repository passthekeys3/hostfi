import { type PropertyTaxSummary } from './tax-mapping';
import type { RevenueEntry } from './types';

// Simplified revenue type for exports (only needs payout_amount)
type TaxRevenueEntry = Pick<RevenueEntry, 'payout_amount'> | { payout_amount: number };

/**
 * Generate TurboTax TXF (Tax Exchange Format) file
 * TXF spec: https://turbotax.intuit.com/txf/
 * 
 * Format:
 * V042 (version)
 * A (account name)
 * D (date)
 * $ (amount)
 * ^ (end of record)
 */

// TXF line number mapping for Schedule E
// These are TurboTax's internal ref numbers for Schedule E fields
const TXF_SCHEDULE_E_MAP: Record<number, { refNum: number; description: string }> = {
  5:  { refNum: 2440, description: 'Rents Received' },
  6:  { refNum: 2441, description: 'Advertising' },
  7:  { refNum: 2442, description: 'Auto and Travel' },
  8:  { refNum: 2443, description: 'Cleaning and Maintenance' },
  9:  { refNum: 2444, description: 'Insurance' },
  10: { refNum: 2445, description: 'Legal and Professional Fees' },
  12: { refNum: 2447, description: 'Mortgage Interest' },
  13: { refNum: 2448, description: 'Other Interest' },
  14: { refNum: 2449, description: 'Repairs' },
  15: { refNum: 2450, description: 'Supplies' },
  16: { refNum: 2451, description: 'Taxes' },
  17: { refNum: 2452, description: 'Utilities' },
  18: { refNum: 2453, description: 'Depreciation' },
  19: { refNum: 2454, description: 'Other Expenses' },
};

export function generateTXF(summaries: PropertyTaxSummary[], taxYear: string, revenueByProperty: Record<string, TaxRevenueEntry[]> = {}): string {
  const lines: string[] = [];
  
  // TXF Header
  lines.push('V042');
  lines.push('AHostFi Tax Export');
  lines.push(`D${taxYear}`);
  lines.push('^');

  for (const summary of summaries) {
    const propertyLabel = summary.property.name;
    
    // Add revenue (Line 5 - Rents received)
    const revenue = revenueByProperty[summary.property.id] || [];
    const totalRevenue = revenue.reduce((sum, r) => sum + r.payout_amount, 0);
    
    if (totalRevenue > 0) {
      const ref = TXF_SCHEDULE_E_MAP[5];
      lines.push('TD');
      lines.push(`N${ref.refNum}`);
      lines.push(`C1`);
      lines.push(`L1`);
      lines.push(`P${propertyLabel}`);
      lines.push(`D12/31/${taxYear}`);
      lines.push(`$${totalRevenue.toFixed(2)}`);
      lines.push('^');
    }

    // Add expense line items
    for (const lineItem of summary.lineItems) {
      if (lineItem.line === 5 || lineItem.amount === 0) continue; // Skip income line and zero amounts
      
      const ref = TXF_SCHEDULE_E_MAP[lineItem.line];
      if (!ref) continue;

      lines.push('TD');
      lines.push(`N${ref.refNum}`);
      lines.push(`C1`);
      lines.push(`L1`);
      lines.push(`P${propertyLabel}`);
      lines.push(`D12/31/${taxYear}`);
      lines.push(`$-${lineItem.amount.toFixed(2)}`);
      lines.push('^');
    }
  }

  return lines.join('\n');
}

/**
 * Generate a printable Schedule E report as HTML
 */
export function generateScheduleEHTML(summaries: PropertyTaxSummary[], taxYear: string, revenueByProperty: Record<string, TaxRevenueEntry[]> = {}): string {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" width="32" height="32"><path d="M50 8L8 42V48H16V88H84V48H92V42L50 8Z" fill="#1a1a2e"/><path d="M22 48V82H78V48L50 24L22 48Z" fill="white"/><rect x="30" y="62" width="10" height="20" rx="1" fill="#14b8a6"/><rect x="44" y="52" width="10" height="30" rx="1" fill="#14b8a6"/><rect x="58" y="40" width="10" height="42" rx="1" fill="#14b8a6"/><rect x="72" y="22" width="10" height="60" rx="1" fill="#14b8a6"/><polygon points="77,10 67,26 87,26" fill="#14b8a6"/></svg>`;

  let html = `
<!DOCTYPE html>
<html>
<head>
<title>Schedule E Report — Tax Year ${taxYear}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 12px; line-height: 1.5; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 600; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #0f766e; }
  .subtitle { color: #6B7280; font-size: 11px; margin-bottom: 20px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 1px solid #E5E7EB; padding-bottom: 20px; }
  .logo { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .logo-text { font-weight: 700; font-size: 18px; color: #111827; }
  .meta { text-align: right; color: #6B7280; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { text-align: left; padding: 8px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; border-bottom: 2px solid #E5E7EB; background: #F9FAFB; }
  th:last-child { text-align: right; }
  td { padding: 8px 12px; border-bottom: 1px solid #F3F4F6; }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .line-num { color: #9CA3AF; font-size: 11px; width: 60px; }
  .total-row td { font-weight: 700; border-top: 2px solid #111827; border-bottom: none; padding-top: 10px; }
  .net-row td { font-weight: 700; font-size: 14px; border-top: 2px solid #111827; }
  .net-positive { color: #0f766e; }
  .net-negative { color: #DC2626; }
  .property-info { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; gap: 24px; }
  .property-info span { color: #6B7280; }
  .property-info strong { color: #111827; }
  .cpa-note { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 16px; margin: 8px 0; font-size: 11px; color: #92400E; }
  .disclaimer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 10px; }
  .summary-box { background: #F0FDFA; border: 1px solid #99F6E4; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .summary-item { text-align: center; }
  .summary-item .label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary-item .value { font-size: 18px; font-weight: 700; margin-top: 4px; color: #111827; }
  @media print {
    body { padding: 20px; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    .summary-box { background: #F0FDFA !important; border: 1px solid #99F6E4 !important; }
    .property-info { background: #F9FAFB !important; border: 1px solid #E5E7EB !important; }
    th { background: #F9FAFB !important; }
    .cpa-note { background: #FFFBEB !important; border: 1px solid #FDE68A !important; }
    h2 { border-bottom-color: #0f766e !important; }
    .net-positive { color: #0f766e !important; }
    .net-negative { color: #DC2626 !important; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">${logoSvg}<span class="logo-text">HostFi</span></div>
    <h1>Schedule E — Supplemental Income and Expenses</h1>
    <div class="subtitle">Tax Year ${taxYear} | Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>
  <div class="meta">
    <div>IRS Form 1040</div>
    <div>Schedule E (Part I)</div>
    <div>Rental Real Estate</div>
  </div>
</div>
`;

  // Portfolio summary
  const totalRevenue = summaries.reduce((sum, s) => {
    const rev = revenueByProperty[s.property.id] || [];
    return sum + rev.reduce((r, e) => r + e.payout_amount, 0);
  }, 0);
  const totalDeductions = summaries.reduce((sum, s) => sum + s.totalDeductions, 0);
  const netIncome = totalRevenue - totalDeductions;

  html += `
<div class="summary-box">
  <div class="summary-grid">
    <div class="summary-item">
      <div class="label">Total Rental Income</div>
      <div class="value">$${fmt(totalRevenue)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Deductions</div>
      <div class="value">$${fmt(totalDeductions)}</div>
    </div>
    <div class="summary-item">
      <div class="label">Net Rental Income</div>
      <div class="value ${netIncome >= 0 ? 'net-positive' : 'net-negative'}">$${fmt(netIncome)}</div>
    </div>
  </div>
</div>
`;

  // Per-property sections
  for (const summary of summaries) {
    const revenue = revenueByProperty[summary.property.id] || [];
    const propRevenue = revenue.reduce((sum, r) => sum + r.payout_amount, 0);
    const propNet = propRevenue - summary.totalDeductions;
    const propType = summary.property.property_type === 'arbitrage' ? 'Rental Arbitrage' :
                     summary.property.property_type === 'str' ? 'Short-Term Rental' :
                     summary.property.property_type === 'ltr' ? 'Long-Term Rental' : 'Primary';

    html += `<h2>${summary.property.name}</h2>`;
    html += `<div class="property-info">
      <div><span>Address:</span> <strong>${summary.property.address_line1}, ${summary.property.city}, ${summary.property.state} ${summary.property.zip}</strong></div>
      <div><span>Type:</span> <strong>${propType}</strong></div>
    </div>`;

    html += `<table>
      <thead><tr><th>Line</th><th>Description</th><th>Amount</th></tr></thead>
      <tbody>`;

    // Revenue line
    html += `<tr>
      <td class="line-num">5</td>
      <td>Rents received</td>
      <td>$${fmt(propRevenue)}</td>
    </tr>`;

    // Expense lines
    for (const lineItem of summary.lineItems) {
      if (lineItem.line === 5) continue;
      if (lineItem.amount === 0) continue;

      html += `<tr>
        <td class="line-num">${lineItem.line}</td>
        <td>${lineItem.description}${lineItem.consultCPA ? ' *' : ''}</td>
        <td>$${fmt(lineItem.amount)}</td>
      </tr>`;
    }

    // Total deductions
    html += `<tr class="total-row">
      <td class="line-num">20</td>
      <td>Total expenses</td>
      <td>$${fmt(summary.totalDeductions)}</td>
    </tr>`;

    // Net income
    html += `<tr class="net-row">
      <td class="line-num">21</td>
      <td>Net rental income (loss)</td>
      <td class="${propNet >= 0 ? 'net-positive' : 'net-negative'}">$${fmt(propNet)}</td>
    </tr>`;

    html += `</tbody></table>`;

    if (summary.lineItems.some(l => l.consultCPA)) {
      html += `<div class="cpa-note">* Items marked with an asterisk may require CPA consultation for proper treatment (e.g., depreciation schedules, improvement capitalization).</div>`;
    }
  }

  html += `
<div class="disclaimer">
  <p><strong>Disclaimer:</strong> This report is generated by HostFi for informational purposes only. It is not tax advice. 
  Consult a qualified tax professional before filing. HostFi is not responsible for the accuracy of tax filings based on this data.</p>
  <p style="margin-top: 8px;">Generated by HostFi | <a href="https://hostfi.ai" style="color: #0f766e;">hostfi.ai</a></p>
</div>
</body>
</html>`;

  return html;
}

/**
 * Generate CSV export of Schedule E data
 */
export function generateScheduleECSV(summaries: PropertyTaxSummary[], taxYear: string, revenueByProperty: Record<string, TaxRevenueEntry[]> = {}): string {
  const rows: string[] = [];
  rows.push('Property,Property Type,Line Number,Description,Amount,Tax Year');

  for (const summary of summaries) {
    const propType = summary.property.property_type;
    const revenue = revenueByProperty[summary.property.id] || [];
    const totalRevenue = revenue.reduce((sum, r) => sum + r.payout_amount, 0);

    // Revenue
    rows.push(`"${summary.property.name}",${propType},5,Rents received,${totalRevenue.toFixed(2)},${taxYear}`);

    // Expenses
    for (const lineItem of summary.lineItems) {
      if (lineItem.line === 5 || lineItem.amount === 0) continue;
      rows.push(`"${summary.property.name}",${propType},${lineItem.line},"${lineItem.description}",${lineItem.amount.toFixed(2)},${taxYear}`);
    }

    // Total
    rows.push(`"${summary.property.name}",${propType},20,Total expenses,${summary.totalDeductions.toFixed(2)},${taxYear}`);
    rows.push(`"${summary.property.name}",${propType},21,Net rental income (loss),${(totalRevenue - summary.totalDeductions).toFixed(2)},${taxYear}`);
  }

  return rows.join('\n');
}

/**
 * Download helper
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
