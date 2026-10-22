import { MULTI_CURRENCY_ASSETS, SUPPORTED_SETTLEMENT_CURRENCIES } from '@/lib/utils/constants';

/**
 * Request validation for the SDK playground proxy. The playground runs on a
 * public marketing page, so everything that reaches the upstream FX engine is
 * allow-listed here first: asset codes come from fixed sets, the amount is a
 * bounded plain decimal, and nothing else from the query string is forwarded.
 */
export const PLAYGROUND_FROM = Object.keys(MULTI_CURRENCY_ASSETS);
export const PLAYGROUND_TO = Array.from(
  new Set<string>([...SUPPORTED_SETTLEMENT_CURRENCIES, ...PLAYGROUND_FROM]),
);

export const PLAYGROUND_MIN_AMOUNT = 0.0000001;
export const PLAYGROUND_MAX_AMOUNT = 10_000;

export type PlaygroundOperation = 'quote' | 'rates';

export type PlaygroundRequest =
  | { operation: 'rates' }
  | { operation: 'quote'; from: string; to: string; amount: string };

export type ParseResult =
  | { ok: true; request: PlaygroundRequest }
  | { ok: false; error: string };

export function parsePlaygroundParams(params: URLSearchParams): ParseResult {
  const operation = params.get('op') ?? 'quote';
  if (operation === 'rates') return { ok: true, request: { operation: 'rates' } };
  if (operation !== 'quote') return { ok: false, error: 'op must be "quote" or "rates".' };

  const from = (params.get('from') ?? '').toUpperCase();
  const to = (params.get('to') ?? '').toUpperCase();
  const amount = params.get('amount') ?? '';

  if (!PLAYGROUND_FROM.includes(from)) {
    return { ok: false, error: `from must be one of: ${PLAYGROUND_FROM.join(', ')}.` };
  }
  if (!PLAYGROUND_TO.includes(to)) {
    return { ok: false, error: `to must be one of: ${PLAYGROUND_TO.join(', ')}.` };
  }
  if (from === to) return { ok: false, error: 'from and to must be different.' };
  if (!/^\d+(\.\d{1,7})?$/.test(amount)) {
    return { ok: false, error: 'amount must be a plain positive decimal with up to 7 places.' };
  }
  const value = Number(amount);
  if (!(value >= PLAYGROUND_MIN_AMOUNT) || value > PLAYGROUND_MAX_AMOUNT) {
    return { ok: false, error: `amount must be between ${PLAYGROUND_MIN_AMOUNT} and ${PLAYGROUND_MAX_AMOUNT}.` };
  }
  return { ok: true, request: { operation: 'quote', from, to, amount } };
}

/** Upstream path + query for a validated request (mirrors the gateway's /api/quote). */
export function upstreamPath(request: PlaygroundRequest): string {
  if (request.operation === 'rates') return '/api/rates';
  const query = new URLSearchParams({ from: request.from, to: request.to, amount: request.amount });
  return `/api/quote?${query.toString()}`;
}

export interface PlaygroundResult {
  ok: boolean;
  /** Upstream HTTP status, or 0 when the upstream could not be reached. */
  status: number;
  latencyMs: number;
  /** The request as sent upstream (never includes the dev key). */
  request: string;
  /** Parsed upstream body on a response. */
  data?: unknown;
  error?: string;
}

/** Fixed-window per-key limiter; in-memory, so per server instance. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return function check(key: string, now = Date.now()) {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      }
      return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
    }
    entry.count += 1;
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfterSec };
  };
}
