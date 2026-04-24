// In-memory token bucket. Per-instance only — not distributed.
// For production behind multiple instances, swap for Upstash/Redis.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimiterOptions {
  readonly capacity: number;
  readonly refillPerSecond: number;
  readonly maxKeys?: number;
}

export function createRateLimiter(opts: LimiterOptions) {
  const { capacity, refillPerSecond, maxKeys = 10_000 } = opts;
  const buckets = new Map<string, Bucket>();

  function prune() {
    if (buckets.size <= maxKeys) return;
    // Evict oldest entries (insertion order in Map).
    const toRemove = buckets.size - maxKeys;
    let removed = 0;
    for (const key of buckets.keys()) {
      if (removed >= toRemove) break;
      buckets.delete(key);
      removed++;
    }
  }

  return function check(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      buckets.set(key, bucket);
      prune();
    } else {
      const elapsed = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, retryAfterMs: 0 };
    }
    const retryAfterMs = Math.ceil(((1 - bucket.tokens) / refillPerSecond) * 1000);
    return { allowed: false, retryAfterMs };
  };
}
