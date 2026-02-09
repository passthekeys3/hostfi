import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const isRateLimited = createRateLimiter('test-under', 5, 60_000);
    const ip = '192.168.1.1';

    // First 5 requests should be allowed
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
  });

  it('blocks requests over the limit', () => {
    const isRateLimited = createRateLimiter('test-over', 3, 60_000);
    const ip = '192.168.1.2';

    // First 3 requests allowed
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);

    // 4th request should be blocked
    expect(isRateLimited(ip)).toBe(true);
    expect(isRateLimited(ip)).toBe(true);
  });

  it('resets after window expires', () => {
    const windowMs = 60_000;
    const isRateLimited = createRateLimiter('test-reset', 2, windowMs);
    const ip = '192.168.1.3';

    // Use up the limit
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(true); // blocked

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1);

    // Should be allowed again
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(false);
    expect(isRateLimited(ip)).toBe(true); // blocked again
  });

  it('tracks different IPs independently', () => {
    const isRateLimited = createRateLimiter('test-ips', 2, 60_000);
    const ip1 = '10.0.0.1';
    const ip2 = '10.0.0.2';

    // IP1 uses its limit
    expect(isRateLimited(ip1)).toBe(false);
    expect(isRateLimited(ip1)).toBe(false);
    expect(isRateLimited(ip1)).toBe(true);

    // IP2 should still be allowed
    expect(isRateLimited(ip2)).toBe(false);
    expect(isRateLimited(ip2)).toBe(false);
    expect(isRateLimited(ip2)).toBe(true);
  });

  it('creates separate limiters for different names', () => {
    const limiterA = createRateLimiter('limiter-a', 1, 60_000);
    const limiterB = createRateLimiter('limiter-b', 1, 60_000);
    const ip = '192.168.1.5';

    // Each limiter should track independently
    expect(limiterA(ip)).toBe(false);
    expect(limiterA(ip)).toBe(true);

    // Limiter B should still allow
    expect(limiterB(ip)).toBe(false);
    expect(limiterB(ip)).toBe(true);
  });
});
