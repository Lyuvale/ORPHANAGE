/**
 * Lightweight in-process rate limiter for public endpoints.
 *
 * Uses a sliding-window (per key) held in an in-memory Map. On a single
 * Vercel/serverless instance this prevents trivial spam; it is deliberately
 * dependency-free. For distributed enforcement across many instances, back it
 * with a shared store (Redis / Supabase) later — the API surface here stays
 * the same.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function createRateLimiter(limit: number, windowMs: number) {
  const buckets = new Map<string, Window>();
  let callsSinceSweep = 0;

  return function rateLimit(key: string): RateLimitResult {
    const now = Date.now();

    // Opportunistic cleanup so the map never grows without bound.
    callsSinceSweep += 1;
    if (callsSinceSweep >= 100) {
      callsSinceSweep = 0;
      for (const [k, w] of buckets) {
        if (w.resetAt <= now) buckets.delete(k);
      }
    }

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };
}

/** Best-effort client IP from proxy headers (Vercel/cloud). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}