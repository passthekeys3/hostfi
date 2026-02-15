import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { tipsEmail, checkInEmail, weeklyDigestEmail } from '@/lib/email-templates';

/**
 * POST /api/email/cron
 * Called by scheduled jobs to send onboarding and digest emails.
 * 
 * Body: { type: 'tips' | 'check-in' | 'weekly-digest' }
 * Auth: CRON_SECRET header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    let sent = 0;
    let skipped = 0;

    switch (type) {
      case 'tips': {
        // Find users who signed up exactly 2 days ago
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const dayStart = twoDaysAgo.toISOString().split('T')[0] + 'T00:00:00Z';
        const dayEnd = twoDaysAgo.toISOString().split('T')[0] + 'T23:59:59Z';

        const { data: users } = await supabase.auth.admin.listUsers();
        const targetUsers = users?.users?.filter(u => 
          u.created_at >= dayStart && u.created_at <= dayEnd
        ) || [];

        for (const user of targetUsers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          if (!profile?.email) { skipped++; continue; }

          const template = tipsEmail(profile.full_name || '');
          await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.htmlBody,
            tag: 'onboarding-tips',
          });
          sent++;
        }
        break;
      }

      case 'check-in': {
        // Find users who signed up exactly 3 days ago
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const dayStart = threeDaysAgo.toISOString().split('T')[0] + 'T00:00:00Z';
        const dayEnd = threeDaysAgo.toISOString().split('T')[0] + 'T23:59:59Z';

        const { data: users } = await supabase.auth.admin.listUsers();
        const targetUsers = users?.users?.filter(u => 
          u.created_at >= dayStart && u.created_at <= dayEnd
        ) || [];

        for (const user of targetUsers) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .single();

          if (!profile?.email) { skipped++; continue; }

          const { count: propertyCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { count: expenseCount } = await supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const template = checkInEmail(
            profile.full_name || '',
            propertyCount || 0,
            expenseCount || 0,
          );
          await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.htmlBody,
            tag: 'onboarding-checkin',
          });
          sent++;
        }
        break;
      }

      case 'weekly-digest': {
        // Find all active users (have at least 1 property)
        const { data: activeProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .not('email', 'is', null);

        if (!activeProfiles) break;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        for (const profile of activeProfiles) {
          // Check if user has properties
          const { count: propCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          if (!propCount || propCount === 0) { skipped++; continue; }

          // Get this week's expenses
          const { data: weekExpenses } = await supabase
            .from('expenses')
            .select('amount, category')
            .eq('user_id', profile.id)
            .gte('date', oneWeekAgo.toISOString().split('T')[0]);

          if (!weekExpenses || weekExpenses.length === 0) { skipped++; continue; }

          const totalSpend = weekExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
          
          // Find top category
          const categoryTotals: Record<string, number> = {};
          for (const e of weekExpenses) {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
          }
          const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

          const template = weeklyDigestEmail(profile.full_name || '', {
            totalSpend,
            expenseCount: weekExpenses.length,
            topCategory: topCategory?.[0] || 'N/A',
            topCategoryAmount: topCategory?.[1] || 0,
            anomalies: [], // TODO: pull from anomaly detection engine
          });

          await sendEmail({
            to: profile.email,
            subject: template.subject,
            html: template.htmlBody,
            tag: 'weekly-digest',
          });
          sent++;
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, sent, skipped });
  } catch (error) {
    console.error('Email cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
