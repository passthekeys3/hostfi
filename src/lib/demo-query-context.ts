import type { Expense, Property } from './types';

function summarizeExpenses(expenses: Expense[], properties: Property[]): string {
  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, { total: number; count: number }> = {};
  const byProperty: Record<string, { total: number; count: number; name: string }> = {};
  const byVendor: Record<string, { total: number; count: number }> = {};
  const byStatus: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const e of expenses) {
    // By category
    if (!byCategory[e.category]) byCategory[e.category] = { total: 0, count: 0 };
    byCategory[e.category].total += e.amount;
    byCategory[e.category].count++;

    // By property
    const prop = properties.find(p => p.id === e.property_id);
    const propName = prop?.name || `Property ${e.property_id}`;
    if (!byProperty[e.property_id]) byProperty[e.property_id] = { total: 0, count: 0, name: propName };
    byProperty[e.property_id].total += e.amount;
    byProperty[e.property_id].count++;

    // By vendor
    const vendor = e.vendor || 'Unknown';
    if (!byVendor[vendor]) byVendor[vendor] = { total: 0, count: 0 };
    byVendor[vendor].total += e.amount;
    byVendor[vendor].count++;

    // By status
    byStatus[e.status] = (byStatus[e.status] || 0) + e.amount;

    // By month
    const month = e.date.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + e.amount;
  }

  return `
PROPERTY PORTFOLIO:
${properties.map(p => `- ${p.name} (ID: ${p.id}): ${p.property_type.toUpperCase()}, ${p.bedrooms}bd/${p.bathrooms}ba, ${p.city}, ${p.state} ${p.zip}`).join('\n')}

EXPENSE SUMMARY (${expenses.length} total expenses, $${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })} total):

By Category:
${Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => `- ${cat}: $${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${data.count} expenses)`).join('\n')}

By Property:
${Object.entries(byProperty).sort((a, b) => b[1].total - a[1].total).map(([, data]) => `- ${data.name}: $${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${data.count} expenses)`).join('\n')}

By Vendor:
${Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total).map(([vendor, data]) => `- ${vendor}: $${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${data.count}x)`).join('\n')}

By Status:
${Object.entries(byStatus).map(([status, total]) => `- ${status}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n')}

By Month:
${Object.entries(byMonth).sort().map(([month, total]) => `- ${month}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`).join('\n')}

RAW EXPENSE DATA:
${expenses.map(e => {
  const prop = properties.find(p => p.id === e.property_id);
  return `- ${e.date} | ${prop?.name || e.property_id} | ${e.category} | ${e.description} | $${e.amount} | ${e.vendor || 'N/A'} | ${e.status} | ${e.frequency}`;
}).join('\n')}
`.trim();
}

export function buildQueryContext(expenses: Expense[], properties: Property[]): string {
  return summarizeExpenses(expenses, properties);
}

export const EXAMPLE_QUESTIONS = [
  "How much did I spend this month?",
  "Which property is most profitable?",
  "What are my biggest expense categories?",
  "Compare revenue across properties",
  "What's my net profit this year?",
  "How much do I spend on cleaning?",
  "Which platform brings the most revenue?",
  "Show me utility costs by property",
];
