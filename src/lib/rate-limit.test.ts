import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to capacity', () => {
    const check = createRateLimiter({ capacity: 3, refillPerSecond: 1 });
    expect(check('ip').allowed).toBe(true);
    expect(check('ip').allowed).toBe(true);
    expect(check('ip').allowed).toBe(true);
    expect(check('ip').allowed).toBe(false);
  });

  it('refills tokens over time', () => {
    const check = createRateLimiter({ capacity: 2, refillPerSecond: 1 });
    check('ip');
    check('ip');
    expect(check('ip').allowed).toBe(false);

    vi.advanceTimersByTime(1100); // > 1 token worth
    expect(check('ip').allowed).toBe(true);
  });

  it('returns retryAfterMs when rate-limited', () => {
    const check = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
    check('ip');
    const result = check('ip');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
    expect(result.retryAfterMs).toBeLessThanOrEqual(1000);
  });

  it('tracks separate keys independently', () => {
    const check = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(check('a').allowed).toBe(true);
    expect(check('b').allowed).toBe(true);
    expect(check('a').allowed).toBe(false);
    expect(check('b').allowed).toBe(false);
  });

  it('caps refill at capacity', () => {
    const check = createRateLimiter({ capacity: 2, refillPerSecond: 10 });
    check('ip');
    vi.advanceTimersByTime(60_000); // way more than needed to refill
    // Should still only have 2 tokens available
    expect(check('ip').allowed).toBe(true);
    expect(check('ip').allowed).toBe(true);
    expect(check('ip').allowed).toBe(false);
  });

  it('prunes to maxKeys when exceeded', () => {
    const check = createRateLimiter({ capacity: 1, refillPerSecond: 1, maxKeys: 3 });
    check('a');
    check('b');
    check('c');
    check('d'); // triggers prune — 'a' evicted (oldest insertion)
    // 'a' bucket gone, so 'a' gets fresh capacity
    expect(check('a').allowed).toBe(true);
  });
});
