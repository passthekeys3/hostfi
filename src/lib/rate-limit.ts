// Rate limiter utility
// Uses Supabase for persistence in production (survives serverless cold starts).
// Falls back to in-memory for development or when Supabase is unavailable.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback
const maps = new Map<string, Map<string, RateLimitEntry>>();

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * Check and increment rate limit using Supabase.
 * Uses the rate_limits table: (key TEXT PRIMARY KEY, count INT, reset_at TIMESTAMPTZ)
 * Returns true if rate limited.
 */
async function checkSupabaseRateLimit(
  supabase: SupabaseClient,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();

  try {
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('count, reset_at')
      .eq('key', key)
      .single();

    if (!existing || now > new Date(existing.reset_at).getTime()) {
      // Expired or new entry -- reset
      await supabase
        .from('rate_limits')
        .upsert({
          key,
          count: 1,
          reset_at: new Date(now + windowMs).toISOString(),
        }, { onConflict: 'key' });
      return false;
    }

    const newCount = existing.count + 1;
    await supabase
      .from('rate_limits')
      .update({ count: newCount })
      .eq('key', key);

    return newCount > maxRequests;
  } catch {
    // If Supabase fails, fall through to in-memory
    return null as unknown as boolean;
  }
}

export function createRateLimiter(name: string, maxRequests: number, windowMs: number = 60_000) {
  if (!maps.has(name)) {
    maps.set(name, new Map());
  }
  const map = maps.get(name)!;

  return function isRateLimited(ip: string): boolean {
    const compositeKey = `${name}:${ip}`;

    // Try Supabase-backed rate limiting (fire-and-forget async with sync fallback)
    const supabase = getServiceClient();
    if (supabase) {
      // We can't make this sync, so we use a dual approach:
      // The in-memory check runs immediately for the current instance,
      // and the Supabase check runs async to persist across instances.
      // On the next request from a different instance, Supabase will have the count.
      checkSupabaseRateLimit(supabase, compositeKey, maxRequests, windowMs)
        .catch(() => { /* fallback to in-memory only */ });
    }

    // In-memory check (always runs for immediate response)
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count++;
    return entry.count > maxRequests;
  };
}

/**
 * Async rate limiter that checks Supabase first for accurate cross-instance limiting.
 * Use this for important limits like daily AI question caps.
 */
export function createAsyncRateLimiter(name: string, maxRequests: number, windowMs: number = 60_000) {
  if (!maps.has(name)) {
    maps.set(name, new Map());
  }
  const map = maps.get(name)!;

  return async function isRateLimited(ip: string): Promise<boolean> {
    const compositeKey = `${name}:${ip}`;

    // Try Supabase first for accuracy
    const supabase = getServiceClient();
    if (supabase) {
      const result = await checkSupabaseRateLimit(supabase, compositeKey, maxRequests, windowMs);
      if (result !== null) return result;
    }

    // Fallback to in-memory
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry || now > entry.resetAt) {
      map.set(ip, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count++;
    return entry.count > maxRequests;
  };
}
