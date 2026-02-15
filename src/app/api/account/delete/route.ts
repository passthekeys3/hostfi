import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimiter } from '@/lib/rate-limit';

const isRateLimited = createRateLimiter('account-delete', 2, 60_000);

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { confirmation } = await request.json();
    if (confirmation !== 'delete') {
      return NextResponse.json({ error: 'Invalid confirmation' }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Use service role to cascade delete all user data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const admin = createAdminClient(supabaseUrl, serviceKey);

    // Delete in dependency order (children first)
    const tables = [
      'parsed_emails',
      'integration_connections', 
      'revenue',
      'recurring_expenses',
      'expenses',
      'properties',
      'profiles',
    ];

    for (const table of tables) {
      const column = table === 'profiles' ? 'id' : 'user_id';
      const { error } = await admin.from(table).delete().eq(column, userId);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
      }
    }

    // Delete the auth user
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Failed to delete auth user:', authError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
