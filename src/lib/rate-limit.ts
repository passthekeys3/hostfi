// Shared rate limiter utility
// Note: In-memory — works for single instance. Use Redis/Upstash for multi-instance.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const maps = new Map<string, Map<string, RateLimitEntry>>();

// Periodic cleanup to prevent memory leaks
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [, map] of maps) {
      for (const [key, entry] of map) {
        if (now > entry.resetAt) map.delete(key);
      }
    }
  };
  // Run cleanup every 5 minutes
  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 5 * 60_000);
  }
}

export function createRateLimiter(name: string, maxRequests: number, windowMs: number = 60_000) {
  if (!maps.has(name)) {
    maps.set(name, new Map());
  }
  const map = maps.get(name)!;

  return function isRateLimited(ip: string): boolean {
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
