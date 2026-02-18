/**
 * Build real user financial context for Ask AI
 * Fetches actual data from Supabase for the authenticated user
 */

interface Property {
  id: string;
  name: string;
  property_type: string;
  city: string;
  state: string;
}

interface Expense {
  id: string;
  property_id: string;
  category: string;
  description: string;
  vendor: string | null;
  amount: number;
  date: string;
  status: string;
}

interface Revenue {
  id: string;
  property_id: string;
  platform: string;
  guest_name: string | null;
  amount: number;
  payout_amount: number | null;
  platform_fee: number | null;
  check_in: string;
  check_out: string;
  nights: number | null;
}

export async function buildUserContext(userId: string): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return 'No financial data available — database not configured.';
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch user's real data (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const since = twelveMonthsAgo.toISOString().split('T')[0];

  const [propertiesRes, expensesRes, revenueRes] = await Promise.all([
    supabase.from('properties').select('id, name, property_type, city, state').eq('user_id', userId),
    supabase.from('expenses').select('id, property_id, category, description, vendor, amount, date, status')
      .eq('user_id', userId).gte('date', since).order('date', { ascending: false }).limit(500),
    supabase.from('revenue').select('id, property_id, platform, guest_name, amount, payout_amount, platform_fee, check_in, check_out, nights')
      .eq('user_id', userId).gte('date', since).order('date', { ascending: false }).limit(500),
  ]);

  const properties: Property[] = propertiesRes.data || [];
  const expenses: Expense[] = expensesRes.data || [];
  const revenue: Revenue[] = revenueRes.data || [];

  if (properties.length === 0) {
    return 'User has no properties set up yet. No financial data available.';
  }

  // Summarize expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, { total: number; count: number }> = {};
  const expByProperty: Record<string, { total: number; count: number }> = {};
  const byVendor: Record<string, { total: number; count: number }> = {};
  const expByMonth: Record<string, number> = {};

  for (const e of expenses) {
    const cat = e.category || 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
    byCategory[cat].total += e.amount;
    byCategory[cat].count++;

    if (!expByProperty[e.property_id]) expByProperty[e.property_id] = { total: 0, count: 0 };
    expByProperty[e.property_id].total += e.amount;
    expByProperty[e.property_id].count++;

    const vendor = e.vendor || 'Unknown';
    if (!byVendor[vendor]) byVendor[vendor] = { total: 0, count: 0 };
    byVendor[vendor].total += e.amount;
    byVendor[vendor].count++;

    const month = e.date?.substring(0, 7);
    if (month) expByMonth[month] = (expByMonth[month] || 0) + e.amount;
  }

  // Summarize revenue
  const totalRevenue = revenue.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPayout = revenue.reduce((sum, r) => sum + (r.payout_amount || r.amount || 0), 0);
  const revByProperty: Record<string, { total: number; bookings: number }> = {};
  const revByPlatform: Record<string, { total: number; bookings: number }> = {};
  const revByMonth: Record<string, number> = {};

  for (const r of revenue) {
    if (!revByProperty[r.property_id]) revByProperty[r.property_id] = { total: 0, bookings: 0 };
    revByProperty[r.property_id].total += r.amount || 0;
    revByProperty[r.property_id].bookings++;

    const plat = r.platform || 'other';
    if (!revByPlatform[plat]) revByPlatform[plat] = { total: 0, bookings: 0 };
    revByPlatform[plat].total += r.amount || 0;
    revByPlatform[plat].bookings++;

    const month = r.check_in?.substring(0, 7);
    if (month) revByMonth[month] = (revByMonth[month] || 0) + (r.amount || 0);
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const propName = (id: string) => properties.find(p => p.id === id)?.name || 'Unknown';

  return `
PROPERTIES (${properties.length}):
${properties.map(p => `- ${p.name}: ${p.property_type?.toUpperCase() || 'STR'}, ${p.city}, ${p.state}`).join('\n')}

EXPENSE SUMMARY (${expenses.length} expenses, ${fmt(totalExpenses)} total, last 12 months):

By Category:
${Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total).map(([cat, d]) => `- ${cat}: ${fmt(d.total)} (${d.count}x)`).join('\n')}

By Property:
${Object.entries(expByProperty).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => `- ${propName(id)}: ${fmt(d.total)} (${d.count}x)`).join('\n')}

Top Vendors:
${Object.entries(byVendor).sort((a, b) => b[1].total - a[1].total).slice(0, 15).map(([v, d]) => `- ${v}: ${fmt(d.total)} (${d.count}x)`).join('\n')}

Monthly Expenses:
${Object.entries(expByMonth).sort().map(([m, t]) => `- ${m}: ${fmt(t)}`).join('\n')}

REVENUE SUMMARY (${revenue.length} bookings, ${fmt(totalRevenue)} gross, ${fmt(totalPayout)} net, last 12 months):

By Property:
${Object.entries(revByProperty).sort((a, b) => b[1].total - a[1].total).map(([id, d]) => `- ${propName(id)}: ${fmt(d.total)} (${d.bookings} bookings)`).join('\n')}

By Platform:
${Object.entries(revByPlatform).sort((a, b) => b[1].total - a[1].total).map(([p, d]) => `- ${p}: ${fmt(d.total)} (${d.bookings} bookings)`).join('\n')}

Monthly Revenue:
${Object.entries(revByMonth).sort().map(([m, t]) => `- ${m}: ${fmt(t)}`).join('\n')}

NET PROFIT: ${fmt(totalRevenue - totalExpenses)} (Revenue ${fmt(totalRevenue)} - Expenses ${fmt(totalExpenses)})

RECENT EXPENSES (last 20):
${expenses.slice(0, 20).map(e => `- ${e.date} | ${propName(e.property_id)} | ${e.category} | ${e.vendor || e.description} | ${fmt(e.amount)} | ${e.status}`).join('\n')}

RECENT BOOKINGS (last 20):
${revenue.slice(0, 20).map(r => `- ${r.check_in} to ${r.check_out} | ${propName(r.property_id)} | ${r.guest_name || 'Guest'} | ${r.platform} | ${fmt(r.amount)}${r.nights ? ` | ${r.nights} nights` : ''}`).join('\n')}
`.trim();
}
