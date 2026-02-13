import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('email-setup', 10, 60_000);

function generatePrefix(): string {
  // Generate a short, readable prefix like "kev_a8f3x"
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// GET: Retrieve user's inbound email address
export async function GET() {
  try {
    const auth = await authenticateRequest();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ email: 'demo_user@in.hostfi.ai', demo: true });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data } = await supabase
      .from('user_profiles')
      .select('inbound_email_prefix')
      .eq('user_id', auth.userId)
      .single();

    if (data?.inbound_email_prefix) {
      return NextResponse.json({ email: `${data.inbound_email_prefix}@in.hostfi.ai` });
    }

    return NextResponse.json({ email: null });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: 'Failed to get email' }, { status: 500 });
  }
}

// POST: Generate a new inbound email address for the user
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const auth = await authenticateRequest();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ email: 'demo_user@in.hostfi.ai', demo: true });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if user already has one
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('inbound_email_prefix')
      .eq('user_id', auth.userId)
      .single();

    if (existing?.inbound_email_prefix) {
      return NextResponse.json({ email: `${existing.inbound_email_prefix}@in.hostfi.ai` });
    }

    // Generate unique prefix with retry
    let prefix = generatePrefix();
    let attempts = 0;
    while (attempts < 5) {
      const { data: conflict } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('inbound_email_prefix', prefix)
        .single();

      if (!conflict) break;
      prefix = generatePrefix();
      attempts++;
    }

    // Upsert the prefix
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: auth.userId,
        inbound_email_prefix: prefix,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save inbound prefix:', error);
      return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
    }

    return NextResponse.json({ email: `${prefix}@in.hostfi.ai` });
  } catch (err) {
    if (err instanceof NextResponse) return err;
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 });
  }
}
