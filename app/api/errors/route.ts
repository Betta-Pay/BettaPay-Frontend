/**
 * POST /api/errors
 *
 * Ingest endpoint for batched frontend error reports.
 *
 * - Enforces IP-based rate limiting (max 10 error reports/requests per minute per IP)
 * - Validates the body strictly against the supported schema
 * - Rejects malformed or oversized payloads
 * - Never logs the raw payload (it is user-adjacent even after scrubbing)
 * - Always returns 204 on the happy path, and treats ingestion failure as
 *   non-fatal so a reporting outage never cascades into the client
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeReports } from '@/lib/errorReporting/store';
import { normalizeRoute } from '@/lib/rum/normalize';
import { VALID_ERROR_SOURCES } from '@/lib/errorReporting/types';
import type { ErrorReport, ErrorSource } from '@/lib/errorReporting/types';

/** Maximum reports accepted per request. */
const MAX_BATCH_SIZE = 20;

/** Maximum payload size (bytes) — 128KB. */
const MAX_PAYLOAD_SIZE = 128 * 1024;

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
function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
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

const contextSchema = z
  .object({
    route: z.string().min(1).max(256),
    isAuthenticated: z.boolean(),
    role: z.string().max(64).nullable(),
    walletConnected: z.boolean(),
    walletConnector: z.string().max(64).nullable(),
    walletNetwork: z.string().max(32).nullable(),
    online: z.boolean(),
    viewport: z.string().max(32).optional(),
  })
  .strict();

const reportSchema = z
  .object({
    clientId: z.string().max(128).regex(/^[a-f0-9]*$/, 'clientId must be hex'),
    fingerprint: z.string().min(1).max(64).regex(/^[a-f0-9]+$/),
    source: z.string().refine((val) => VALID_ERROR_SOURCES.has(val), {
      message: 'Invalid error source',
    }),
    name: z.string().min(1).max(64),
    message: z.string().min(1).max(1024),
    stack: z.string().max(8192).optional(),
    componentStack: z.string().max(4096).optional(),
    count: z.number().int().min(1).max(10000),
    context: contextSchema,
    timestamp: z.number().positive().max(Date.now() + 86400000),
    appVersion: z.string().max(64).optional(),
  })
  .strict();

const batchSchema = z
  .object({
    errors: z.array(reportSchema).min(1).max(MAX_BATCH_SIZE),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

    const { allowed, retryAfterSeconds } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_PAYLOAD_SIZE) {
      return new NextResponse(null, { status: 413 });
    }

    const raw = await request.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return new NextResponse(null, { status: 413 });
    }

    const parsed = batchSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    const reports: ErrorReport[] = parsed.data.errors.map((report) => ({
      ...report,
      source: report.source as ErrorSource,
      context: {
        ...report.context,
        route: normalizeRoute(report.context.route),
      },
    }));

    storeReports(reports);

    return new NextResponse(null, { status: 204 });
  } catch {
    // Ingestion failure is non-fatal: never let telemetry break the client.
    return new NextResponse(null, { status: 204 });
  }
}
