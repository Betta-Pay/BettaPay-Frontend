import { z } from 'zod';
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

export const playgroundOperationSchema = z.enum(['quote', 'rates'], {
  message: 'op must be "quote" or "rates".',
});

export const playgroundQuoteSchema = z
  .object({
    from: z
      .string()
      .min(1, { message: `from must be one of: ${PLAYGROUND_FROM.join(', ')}.` })
      .transform((val) => val.toUpperCase())
      .refine((val) => PLAYGROUND_FROM.includes(val), {
        message: `from must be one of: ${PLAYGROUND_FROM.join(', ')}.`,
      }),
    to: z
      .string()
      .min(1, { message: `to must be one of: ${PLAYGROUND_TO.join(', ')}.` })
      .transform((val) => val.toUpperCase())
      .refine((val) => PLAYGROUND_TO.includes(val), {
        message: `to must be one of: ${PLAYGROUND_TO.join(', ')}.`,
      }),
    amount: z
      .string()
      .min(1, { message: 'amount must be a plain positive decimal with up to 7 places.' })
      .refine((val) => /^\d+(\.\d{1,7})?$/.test(val), {
        message: 'amount must be a plain positive decimal with up to 7 places.',
      })
      .refine(
        (val) => {
          const num = Number(val);
          return !Number.isNaN(num) && num >= PLAYGROUND_MIN_AMOUNT && num <= PLAYGROUND_MAX_AMOUNT;
        },
        {
          message: `amount must be between ${PLAYGROUND_MIN_AMOUNT} and ${PLAYGROUND_MAX_AMOUNT}.`,
        },
      ),
  })
  .refine((data) => data.from !== data.to, {
    message: 'from and to must be different.',
    path: ['to'],
  });

export function parsePlaygroundParams(params: URLSearchParams): ParseResult {
  const operation = params.get('op') ?? 'quote';
  const opParsed = playgroundOperationSchema.safeParse(operation);
  if (!opParsed.success) {
    return { ok: false, error: opParsed.error.issues[0]?.message ?? 'op must be "quote" or "rates".' };
  }

  if (opParsed.data === 'rates') {
    return { ok: true, request: { operation: 'rates' } };
  }

  const raw = {
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    amount: params.get('amount') ?? '',
  };

  const parsed = playgroundQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid query parameters.' };
  }

  return {
    ok: true,
    request: {
      operation: 'quote',
      from: parsed.data.from,
      to: parsed.data.to,
      amount: parsed.data.amount,
    },
  };
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
