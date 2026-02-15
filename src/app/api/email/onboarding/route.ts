import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { welcomeEmail, tipsEmail, checkInEmail } from '@/lib/email-templates';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('onboarding-email', 5, 60_000);

/**
 * POST /api/email/onboarding
 * Triggers onboarding emails. Called internally after signup or via cron.
 * 
 * Body: { type: 'welcome' | 'tips' | 'check-in', userId: string }
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Verify: service role key OR authenticated user (can only send to themselves)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = request.headers.get('authorization');
    const isServiceCall = authHeader === `Bearer ${serviceKey}`;

    const { type, userId } = await request.json();
    if (!type || !userId) {
      return NextResponse.json({ error: 'Missing type or userId' }, { status: 400 });
    }

    // If not a service call, verify the user is requesting their own email
    if (!isServiceCall && process.env.NODE_ENV === 'production') {
      const { createClient: createServerClient } = await import('@/lib/supabase/server');
      const userSupabase = await createServerClient();
      if (!userSupabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      const { data: { user } } = await userSupabase.auth.getUser();
      if (!user || user.id !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Only allow welcome emails from client-side
      if (type !== 'welcome') {
        return NextResponse.json({ error: 'Unauthorized email type' }, { status: 403 });
      }
    }

    // Fetch user data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let template;
    switch (type) {
      case 'welcome':
        template = welcomeEmail(profile.full_name || '');
        break;
      case 'tips':
        template = tipsEmail(profile.full_name || '');
        break;
      case 'check-in': {
        const { count: propertyCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        const { count: expenseCount } = await supabase
          .from('expenses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        template = checkInEmail(
          profile.full_name || '',
          propertyCount || 0,
          expenseCount || 0
        );
        break;
      }
      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }

    const result = await sendEmail({
      to: profile.email,
      subject: template.subject,
      html: template.htmlBody,
      tag: `onboarding-${type}`,
    });

    return NextResponse.json({ success: true, messageId: result });
  } catch (error) {
    console.error('Onboarding email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
