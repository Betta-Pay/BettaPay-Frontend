/**
 * GET /api/playground/quote  – sandboxed proxy for the SDK playground.
 *
 *   ?op=quote&from=USDC&to=NGN&amount=50   → upstream GET /api/quote
 *   ?op=rates                              → upstream GET /api/rates
 *
 * Public (the /sdks page is), so it is hardened instead: allow-listed assets,
 * bounded amount, per-IP rate limit, upstream timeout, GET only. The optional
 * dev key (PLAYGROUND_API_KEY) is attached server-side and never returned.
 * Upstream failures surface as errors — this route never invents a response.
 *
 * Upstream base: PLAYGROUND_API_BASE_URL, else NEXT_PUBLIC_API_URL, else the
 * default backend origin used everywhere else in the app.
 */

import { NextResponse } from 'next/server';
import {
  createRateLimiter,
  parsePlaygroundParams,
  upstreamPath,
  type PlaygroundResult,
} from '@/lib/playground/quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPSTREAM_TIMEOUT_MS = 5000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const limiter = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

function upstreamBase(): string {
  const raw =
    process.env.PLAYGROUND_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.replace(/\/+$/, '');
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  const limit = limiter(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: `Playground rate limit reached. Retry in ${limit.retryAfterSec}s.` },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const parsed = parsePlaygroundParams(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400, headers: NO_STORE });
  }

  const path = upstreamPath(parsed.request);
  const headers: Record<string, string> = { accept: 'application/json' };
  const devKey = process.env.PLAYGROUND_API_KEY;
  if (devKey) headers.authorization = `Bearer ${devKey}`;

  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);

  try {
    const res = await fetch(`${upstreamBase()}${path}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body: returned as text */
    }
    const result: PlaygroundResult = {
      ok: res.ok,
      status: res.status,
      latencyMs: elapsed(),
      request: `GET ${path}`,
      data,
    };
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    const result: PlaygroundResult = {
      ok: false,
      status: 0,
      latencyMs: elapsed(),
      request: `GET ${path}`,
      error: timedOut
        ? `The FX service did not respond within ${UPSTREAM_TIMEOUT_MS / 1000}s.`
        : 'The FX service could not be reached.',
    };
    return NextResponse.json(result, { status: timedOut ? 504 : 502, headers: NO_STORE });
  }
}
