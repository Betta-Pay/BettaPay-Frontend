'use client';

import { useCallback, useEffect } from 'react';
import { useRateLimitStore } from '../store/rateLimitStore';

export const DEFAULT_RETRY_AFTER_SECONDS = 60;

/**
 * Parses an HTTP `Retry-After` response header value into countdown seconds.
 *
 * Supports both RFC 9110 §10.2.3 formats:
 *   1. Delta-seconds (non-negative integer, e.g. `"15"` or `15`)
 *   2. HTTP-date timestamp (e.g. `"Wed, 21 Oct 2026 07:28:00 GMT"`)
 *
 * Falls back to `DEFAULT_RETRY_AFTER_SECONDS` when the header is missing,
 * malformed, or already in the past.
 */
export function parseRetryAfterHeader(
  headerValue: string | number | null | undefined,
  nowMs: number = Date.now(),
): number {
  if (typeof headerValue === 'number') {
    if (Number.isFinite(headerValue) && headerValue > 0) {
      return Math.ceil(headerValue);
    }
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  if (typeof headerValue !== 'string') {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  const trimmed = headerValue.trim();
  if (!trimmed) {
    return DEFAULT_RETRY_AFTER_SECONDS;
  }

  // 1. Delta-seconds format (digits or positive decimal)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Math.ceil(Number(trimmed));
    return seconds > 0 ? seconds : DEFAULT_RETRY_AFTER_SECONDS;
  }

  // 2. HTTP-date format
  const targetMs = Date.parse(trimmed);
  if (!Number.isNaN(targetMs)) {
    const deltaSeconds = Math.ceil((targetMs - nowMs) / 1000);
    return deltaSeconds > 0 ? deltaSeconds : 0;
  }

  return DEFAULT_RETRY_AFTER_SECONDS;
}

/** Keep the shared countdown current while a rate-limit window is active. */
export function useRateLimitCountdown(
  retryAfterHeader?: string | number | null,
  endpoint?: string | null,
) {
  const rateLimitedUntil = useRateLimitStore((state) => state.rateLimitedUntil);
  const secondsRemaining = useRateLimitStore((state) => state.secondsRemaining);
  const setRateLimited = useRateLimitStore((state) => state.setRateLimited);
  const tick = useRateLimitStore((state) => state.tick);

  const applyRetryAfter = useCallback(
    (headerValue: string | number | null | undefined, targetEndpoint?: string | null) => {
      const seconds = parseRetryAfterHeader(headerValue);
      if (seconds > 0) {
        setRateLimited(seconds, targetEndpoint ?? endpoint ?? null);
      }
      return seconds;
    },
    [endpoint, setRateLimited],
  );

  useEffect(() => {
    if (retryAfterHeader === undefined || retryAfterHeader === null || retryAfterHeader === '') {
      return;
    }
    const seconds = parseRetryAfterHeader(retryAfterHeader);
    if (seconds > 0) {
      setRateLimited(seconds, endpoint ?? null);
    }
  }, [retryAfterHeader, endpoint, setRateLimited]);

  useEffect(() => {
    if (rateLimitedUntil <= 0) return;

    // Reconcile persisted windows immediately, including ones that expired
    // while the app was closed. Each tick uses the epoch to avoid timer drift.
    tick();
    if (rateLimitedUntil <= Date.now()) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil, tick]);

  return {
    secondsRemaining,
    rateLimitedUntil,
    isRateLimited: secondsRemaining > 0,
    applyRetryAfter,
  };
}
