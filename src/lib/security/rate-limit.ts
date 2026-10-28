/**
 * Fixed-memory sliding-window rate limiter. In-process only: on multi-instance or serverless
 * hosting each instance enforces its own window (documented in README → Security). Swap for a
 * shared store (e.g. Redis/Upstash) if stricter global limits are required.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + this.windowMs - now) / 1000)), remaining: 0 };
    }
    recent.push(now);
    this.hits.delete(key);
    this.hits.set(key, recent);
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return { allowed: true, retryAfterSeconds: 0, remaining: this.max - recent.length };
  }
}

/** Best-effort client key from proxy headers. Never logged in raw form. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}
