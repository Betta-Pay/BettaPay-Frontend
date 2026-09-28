/**
 * IP rate limiting for the `/api/errors` ingestion endpoint.
 *
 * Deliberately kept out of the route module: Next.js route files may only
 * export HTTP handlers and route config, so an extra export (the test-only
 * reset below) fails the generated route type check.
 */

/** Rate limit settings: max 10 requests/reports per minute per IP. */
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

interface RateLimitRecord {
  timestamps: number[];
}

const globalForErrors = global as unknown as {
  errorsRateLimitMap?: Map<string, RateLimitRecord>;
};

const rateLimitMap =
  globalForErrors.errorsRateLimitMap || new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalForErrors.errorsRateLimitMap = rateLimitMap;
}

/** Clears rate limit store (useful for test isolation). */
export function clearRateLimits() {
  rateLimitMap.clear();
}

/**
 * Checks and updates rate limit for a given IP.
 * Returns true if allowed, false if rate limit exceeded.
 */
export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };

  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= RATE_LIMIT_MAX) {
    const oldest = record.timestamps[0];
    const resetMs = oldest + RATE_LIMIT_WINDOW_MS - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(resetMs / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  record.timestamps.push(now);
  rateLimitMap.set(ip, record);
  return { allowed: true, retryAfterSeconds: 0 };
}
