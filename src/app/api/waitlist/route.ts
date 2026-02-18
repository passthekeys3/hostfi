import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email';

const isRateLimited = createRateLimiter('waitlist', 5, 60_000);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { name, email } = await req.json();

    if (!name || typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 200) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase.from('waitlist').upsert(
      { name: name.trim(), email: email.trim().toLowerCase() },
      { onConflict: 'email' }
    );

    if (error) {
      console.error('Waitlist insert error:', error);
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }

    // Send confirmation email
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: "You're on the HostFi waitlist",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px;">Hey ${name.trim().split(' ')[0]},</h1>
          <p style="font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 24px;">
            Thanks for signing up for early access to HostFi. We're building AI-powered expense management for short-term rental operators, and you'll be one of the first to try it.
          </p>
          <p style="font-size: 15px; color: #6B7280; line-height: 1.6; margin-bottom: 24px;">
            We'll reach out soon with your invite. In the meantime, if you have questions or feedback, just reply to this email.
          </p>
          <p style="font-size: 15px; color: #111827; font-weight: 600;">The HostFi Team</p>
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />
          <p style="font-size: 12px; color: #9CA3AF;">hostfi.ai</p>
        </div>
      `,
    }).catch(() => {}); // Don't fail waitlist signup if email fails

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Invalid waitlist request:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
