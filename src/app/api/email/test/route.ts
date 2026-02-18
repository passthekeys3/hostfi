import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('email-test', 3, 60_000);

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited - try again in a minute' }, { status: 429 });
  }

  try {
    const auth = await authenticateRequest();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get user's inbound email prefix
    const { data: profile } = await supabase
      .from('profiles')
      .select('inbound_email_prefix, email')
      .eq('id', auth.userId)
      .single();

    if (!profile?.inbound_email_prefix) {
      return NextResponse.json(
        { error: 'No billing email configured. Generate one first.' },
        { status: 400 }
      );
    }

    const billingEmail = `${profile.inbound_email_prefix}@in.hostfi.ai`;

    // Send a test email using Resend API (if configured)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; color: #111; margin-bottom: 16px;">✅ Test Email Received!</h1>
          <p style="color: #666; line-height: 1.6;">
            This confirms your HostFi billing email is working correctly.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Your billing email: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${billingEmail}</code>
          </p>
          <p style="color: #666; line-height: 1.6; margin-top: 24px;">
            You can now add this email to your utility provider accounts to automatically track bills.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated test from HostFi.
          </p>
        </div>
      `;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'HostFi <noreply@hostfi.ai>',
          to: billingEmail,
          subject: 'HostFi Test Email - Connection Verified',
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        console.error('Resend API error:', await response.text());
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Test email sent' });
    }

    // If no Resend key, just return success (for development)
    console.log(`[DEV] Would send test email to: ${billingEmail}`);
    return NextResponse.json({ success: true, message: 'Test email simulated (no email service configured)' });
  } catch (err) {
    console.error('Test email error:', err);
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
