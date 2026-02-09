import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface AuthResult {
  authenticated: boolean;
  userId: string;
  email?: string;
}

/**
 * Authenticate a request via Supabase.
 * Returns userId if authenticated, or null if in demo mode (Supabase not configured).
 * Throws a NextResponse if unauthorized.
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient();

  // Demo mode — Supabase not configured
  if (!supabase) {
    return { authenticated: false, userId: 'demo' };
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
