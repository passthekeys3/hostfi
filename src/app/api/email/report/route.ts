import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { monthlyReportEmail } from '@/lib/email-templates';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('email-report', 3, 60_000);

/**
 * POST /api/email/report
 * Sends a monthly report email to the authenticated user.
 * Body: { month?: number, year?: number } (defaults to previous month)
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const targetMonth = body.month ?? now.getMonth(); // 0-indexed, defaults to current month
    const targetYear = body.year ?? now.getFullYear();

    // Date range for the target month
    const firstOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const lastOfMonth = new Date(targetYear, targetMonth, 0);
    const monthName = firstOfMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const monthStart = firstOfMonth.toISOString().split('T')[0];
    const monthEnd = lastOfMonth.toISOString().split('T')[0];

    // Previous month for MoM
    const firstOfPrevMonth = new Date(targetYear, targetMonth - 2, 1);
    const lastOfPrevMonth = new Date(targetYear, targetMonth - 1, 0);
    const prevStart = firstOfPrevMonth.toISOString().split('T')[0];
    const prevEnd = lastOfPrevMonth.toISOString().split('T')[0];

    // Use service role for data queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { createClient: createAdmin } = await import('@supabase/supabase-js');
    const admin = createAdmin(supabaseUrl, serviceKey);

    // Fetch data
    const [
      { data: profile },
      { data: properties },
      { data: expenses },
      { data: revenue },
      { data: prevExpenses },
    ] = await Promise.all([
      admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
      admin.from('properties').select('id, name').eq('user_id', user.id),
      admin.from('expenses').select('amount, category, description, property_id').eq('user_id', user.id).gte('date', monthStart).lte('date', monthEnd),
      admin.from('revenue').select('amount, property_id').eq('user_id', user.id).gte('check_in', monthStart).lte('check_in', monthEnd),
      admin.from('expenses').select('amount').eq('user_id', user.id).gte('date', prevStart).lte('date', prevEnd),
    ]);

    if (!profile?.email) {
      return NextResponse.json({ error: 'No email on file' }, { status: 400 });
    }

    const totalSpend = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);
    const totalRevenue = (revenue || []).reduce((s, r) => s + Number(r.amount), 0);
    const prevTotalSpend = (prevExpenses || []).reduce((s, e) => s + Number(e.amount), 0);

    // Category breakdown
    const catTotals: Record<string, number> = {};
    for (const e of (expenses || [])) {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    }
    const categoryBreakdown = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percent: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      }));

    // Property breakdown
    const propertyBreakdown = (properties || []).map(p => {
      const pExp = (expenses || []).filter(e => e.property_id === p.id).reduce((s, e) => s + Number(e.amount), 0);
      const pRev = (revenue || []).filter(r => r.property_id === p.id).reduce((s, r) => s + Number(r.amount), 0);
      return { name: p.name, expenses: pExp, revenue: pRev, net: pRev - pExp };
    });

    // Top expense
    const sorted = [...(expenses || [])].sort((a, b) => Number(b.amount) - Number(a.amount));
    const topExpense = sorted[0] ? {
      description: sorted[0].description || sorted[0].category,
      amount: Number(sorted[0].amount),
      property: (properties || []).find(p => p.id === sorted[0].property_id)?.name || 'Unknown',
    } : null;

    const momChange = prevTotalSpend > 0 ? ((totalSpend - prevTotalSpend) / prevTotalSpend) * 100 : null;

    const template = monthlyReportEmail(profile.full_name || '', {
      month: monthName,
      totalSpend,
      totalRevenue,
      netIncome: totalRevenue - totalSpend,
      expenseCount: (expenses || []).length,
      propertyCount: (properties || []).length,
      categoryBreakdown,
      propertyBreakdown,
      momChange,
      anomalies: [],
      topExpense,
    });

    await sendEmail({
      to: profile.email,
      subject: template.subject,
      html: template.htmlBody,
      tag: 'monthly-report-manual',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Report email error:', error);
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 });
  }
}
