import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('unsubscribe', 10, 60_000);

/**
 * POST /api/email/unsubscribe
 * Unsubscribes an email from all marketing emails.
 * Always returns success to avoid leaking email existence.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ success: true }); // Don't reveal rate limiting
  }

  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: true });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: true });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find user by email and update preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          email_preferences: {
            email_weekly_digest: false,
            email_monthly_report: false,
            email_tips: false,
            email_anomaly_alerts: false,
          },
        })
        .eq('id', profile.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe request failed:', error);
    return NextResponse.json({ success: true }); // Never reveal errors
  }
}
