import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function sendWelcomeEmail(userId: string) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai';
    await fetch(`${baseUrl}/api/email/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type: 'welcome', userId }),
    });
  } catch (error) {
    // Non-blocking — don't fail auth if email fails
    console.error('Failed to send welcome email:', error);
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect — only allow relative paths starting with /
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard';
  }

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Send welcome email for new users (non-blocking)
        if (data?.user) {
          const isNewUser = data.user.created_at && 
            (Date.now() - new Date(data.user.created_at).getTime()) < 60_000; // Created within last 60s
          if (isNewUser) {
            sendWelcomeEmail(data.user.id);
          }
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
