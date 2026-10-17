/**
 * In-memory sliding-window rate limiter. Per-process — for multi-instance
 * deployments swap the Map for a shared store (Redis/Upstash); the call site
 * (`check(key)`) stays identical. See RATE_LIMIT.md.
 */

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export interface RateLimiter {
  check(key: string): void;
  reset(key?: string): void;
}

export class RateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const buckets = new Map<string, { timestamps: number[] }>();

  function check(key: string): void {
    const now = Date.now();
    const bucket = buckets.get(key) ?? { timestamps: [] };

    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

    if (bucket.timestamps.length >= options.max) {
      buckets.set(key, bucket);
      throw new RateLimitError();
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    // Opportunistic cleanup so the map cannot grow unboundedly.
    if (buckets.size > 1000) {
      for (const [k, b] of buckets) {
        if (b.timestamps.every((t) => now - t >= options.windowMs)) buckets.delete(k);
      }
    }
  }

  function reset(key?: string): void {
    if (key === undefined) buckets.clear();
    else buckets.delete(key);
  }

  return { check, reset };
}

/** Default limiter for public lead submissions (5 / 10 min / key). */
const leadLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export function checkRateLimit(key: string): void {
  leadLimiter.check(key);
}

/** Test seam — clear all lead-rate-limit buckets. */
export function resetRateLimiter(): void {
  leadLimiter.reset();
}
