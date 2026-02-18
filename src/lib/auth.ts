import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthResult {
  authenticated: boolean;
  userId: string;
  email?: string;
}

/**
 * Authenticate a request via Supabase.
 * Throws a NextResponse if unauthorized or Supabase not configured.
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient();

  if (!supabase) {
    throw NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email,
  };
}
