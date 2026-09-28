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
import { checkRateLimit } from '@/lib/utils/errorsRateLimit';

/** Maximum reports accepted per request. */
const MAX_BATCH_SIZE = 20;

/** Maximum payload size (bytes) — 128KB. */
const MAX_PAYLOAD_SIZE = 128 * 1024;

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
