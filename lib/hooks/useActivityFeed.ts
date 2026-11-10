"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api/axios";
import { getApiBaseUrl } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/authStore";

// ─── Public types ──────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "payment_received"
  | "settlement_initiated"
  | "settlement_completed"
  | "webhook_delivered"
  | "api_key_used";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  timestamp: string;
  detailHref: string;
  metadata?: Record<string, unknown>;
}

/**
 * Live connection status exposed to the UI so it can render an indicator.
 *
 * - `connecting`   — transport is being established (SSE connecting / first poll in-flight)
 * - `connected`    — SSE stream is open and receiving events (or poll succeeded)
 * - `polling`      — SSE unavailable; falling back to HTTP polling
 * - `disconnected` — all transports failed / component unmounted
 */
export type ActivityConnectionStatus =
  | "connecting"
  | "connected"
  | "polling"
  | "disconnected";

// ─── Internal constants ────────────────────────────────────────────────────────

/** How long to wait before deciding SSE has failed and switching to polling */
const SSE_CONNECT_TIMEOUT_MS = 8_000;

/** Polling interval used when SSE is unavailable */
const POLL_INTERVAL_MS = 30_000;

/** Maximum consecutive poll failures before the error state is surfaced */
const MAX_POLL_ERRORS = 3;

/** Base delay (1s) for SSE reconnection exponential backoff (#906) */
export const SSE_BACKOFF_BASE_MS = 1_000;

/** Maximum delay cap (30s) for SSE reconnection exponential backoff (#906) */
export const SSE_BACKOFF_MAX_MS = 30_000;

/** Maximum SSE reconnection attempts before staying on HTTP polling fallback */
export const SSE_MAX_RETRIES = 5;

export interface SseBackoffOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Maximum fractional jitter added to the exponential delay (default 0.2 = up to +20%). */
  jitterRatio?: number;
  random?: () => number;
}

/**
 * Computes exponential backoff delay (1s, 2s, 4s, 8s, 16s, capped at 30s) with
 * randomized positive jitter to prevent thundering-herd SSE reconnections.
 */
export function computeSseBackoffDelay(
  attempt: number,
  options?: SseBackoffOptions,
): number {
  const baseDelayMs = options?.baseDelayMs ?? SSE_BACKOFF_BASE_MS;
  const maxDelayMs = options?.maxDelayMs ?? SSE_BACKOFF_MAX_MS;
  const jitterRatio = options?.jitterRatio ?? 0.2;
  const randomFn = options?.random ?? Math.random;

  const safeAttempt = Math.max(0, Math.floor(attempt));
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, safeAttempt));
  const jitter = Math.floor(exponential * jitterRatio * randomFn());
  return Math.min(maxDelayMs, exponential + jitter);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deduplicate(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useActivityFeed
 *
 * Connects to the backend activity stream via Server-Sent Events for real-time
 * push delivery. If the SSE endpoint is unreachable (network error, 4xx/5xx,
 * or no response within `SSE_CONNECT_TIMEOUT_MS`) the hook transparently falls
 * back to `setInterval` polling every 30 seconds.
 */
export function useActivityFeed(limit = 20, filter = "all") {
  const { user, isLoggedIn } = useAuthStore();
  // Use the real user ID when available; fall back to the demo merchant ID
  // that the local session route always returns — this ensures the activity
  // feed shows data immediately on page load before the async session check
  // has finished rehydrating the in-memory user object.
  const merchantId =
    user?.id ??
    (isLoggedIn ? "GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD" : null);


  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ActivityConnectionStatus>("connecting");

  // Pagination states
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Refs that outlive re-renders without causing extra effect runs
  const mountedRef = useRef(true);
  const evsRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRetryCountRef = useRef(0);
  const pollErrorCountRef = useRef(0);
  // Tracks whether we've already committed to the polling fallback so we don't
  // attempt SSE reconnection on visibility-change wakeups.
  const usePollFallbackRef = useRef(false);

  // Keep latest parameters in a ref for callbacks
  const stateRef = useRef({ merchantId, limit, filter, cursor });
  useEffect(() => {
    stateRef.current = { merchantId, limit, filter, cursor };
  }, [merchantId, limit, filter, cursor]);

  // ── REST fetch (initial load + polling fallback) ──────────────────────────

  const fetchEvents = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const mId = stateRef.current.merchantId;
      if (!mId) return;

      if (!opts.silent && mountedRef.current) setIsLoading(true);
      try {
        const path = `/api/merchants/${mId}/activity?limit=${limit}&filter=${filter}`;
        const res = await apiClient.get<{ data: ActivityEvent[]; nextCursor: string | null }>(path);
        const incoming = res.data?.data ?? [];
        const nextCursor = res.data?.nextCursor ?? null;

        if (mountedRef.current) {
          setEvents((prev) => {
            if (opts.silent) {
              return deduplicate([...incoming, ...prev]);
            } else {
              return incoming;
            }
          });
          if (!opts.silent) {
            setCursor(nextCursor);
            setHasNextPage(Boolean(nextCursor));
          }
          setError(null);
          pollErrorCountRef.current = 0;
        }
      } catch {
        pollErrorCountRef.current += 1;
        if (
          mountedRef.current &&
          pollErrorCountRef.current >= MAX_POLL_ERRORS
        ) {
          setError("Failed to load activity feed");
        }
      } finally {
        if (mountedRef.current && !opts.silent) setIsLoading(false);
      }
    },
    [limit, filter],
  );

  // ── Cursor pagination (Load More) ─────────────────────────────────────────

  const loadMore = useCallback(async () => {
    const mId = stateRef.current.merchantId;
    if (!mId || isFetchingNextPage || !hasNextPage || isLoading) return;

    setIsFetchingNextPage(true);
    try {
      const path = `/api/merchants/${mId}/activity?limit=${limit}&filter=${filter}&cursor=${cursor}`;
      const res = await apiClient.get<{ data: ActivityEvent[]; nextCursor: string | null }>(path);
      const incoming = res.data?.data ?? [];
      const nextCursor = res.data?.nextCursor ?? null;

      if (mountedRef.current) {
        setEvents((prev) => deduplicate([...prev, ...incoming]));
        setCursor(nextCursor);
        setHasNextPage(Boolean(nextCursor));
        setError(null);
      }
    } catch {
      console.error("[useActivityFeed] Failed to load more events");
    } finally {
      if (mountedRef.current) setIsFetchingNextPage(false);
    }
  }, [cursor, hasNextPage, isFetchingNextPage, isLoading, limit, filter]);

  // ── Polling fallback ──────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (!mountedRef.current) return;
    usePollFallbackRef.current = true;
    setConnectionStatus("polling");

    if (pollTimerRef.current !== null) return; // already polling
    pollTimerRef.current = setInterval(() => {
      if (mountedRef.current && document.visibilityState === "visible") {
        void fetchEvents({ silent: true });
      }
    }, POLL_INTERVAL_MS);
  }, [fetchEvents]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────

  const closeSSE = useCallback(() => {
    if (sseTimeoutRef.current !== null) {
      clearTimeout(sseTimeoutRef.current);
      sseTimeoutRef.current = null;
    }
    if (sseRetryTimerRef.current !== null) {
      clearTimeout(sseRetryTimerRef.current);
      sseRetryTimerRef.current = null;
    }
    if (evsRef.current) {
      evsRef.current.close();
      evsRef.current = null;
    }
  }, []);

  const startSSE = useCallback(() => {
    const mId = stateRef.current.merchantId;
    if (!mId) return;

    if (typeof EventSource === "undefined") {
      void fetchEvents();
      startPolling();
      return;
    }

    closeSSE();
    setConnectionStatus("connecting");

    const apiBase = getApiBaseUrl(); // issue #488: shared origin, no per-hook default
    const path = `/api/merchants/${mId}/activity/stream?limit=${limit}&filter=${filter}`;
    const url = `${apiBase}${path}`;

    let hasConnected = false;

    const scheduleSseReconnectOrFallback = () => {
      if (!mountedRef.current) return;
      closeSSE();

      const attempt = sseRetryCountRef.current;
      if (attempt < SSE_MAX_RETRIES) {
        sseRetryCountRef.current = attempt + 1;
        const delayMs = computeSseBackoffDelay(attempt);
        sseRetryTimerRef.current = setTimeout(() => {
          sseRetryTimerRef.current = null;
          if (mountedRef.current) {
            startSSE();
          }
        }, delayMs);
      } else {
        console.warn(
          "[useActivityFeed] SSE max retries reached — falling back to polling",
        );
        void fetchEvents();
        startPolling();
      }
    };

    sseTimeoutRef.current = setTimeout(() => {
      if (!hasConnected && mountedRef.current) {
        console.warn(
          "[useActivityFeed] SSE connection timed out — scheduling backoff retry",
        );
        scheduleSseReconnectOrFallback();
      }
    }, SSE_CONNECT_TIMEOUT_MS);

    const es = new EventSource(url, { withCredentials: true });
    evsRef.current = es;

    es.onopen = () => {
      hasConnected = true;
      sseRetryCountRef.current = 0;
      if (sseTimeoutRef.current !== null) {
        clearTimeout(sseTimeoutRef.current);
        sseTimeoutRef.current = null;
      }
      if (mountedRef.current) {
        stopPolling();
        usePollFallbackRef.current = false;
        setConnectionStatus("connected");
        setError(null);
      }
    };

    es.onmessage = (ev: MessageEvent<string>) => {
      hasConnected = true;
      sseRetryCountRef.current = 0;
      if (!mountedRef.current) return;
      try {
        const incoming = JSON.parse(ev.data) as ActivityEvent | ActivityEvent[];
        const rawEvents = Array.isArray(incoming) ? incoming : [incoming];

        const filteredLive = rawEvents.filter(
          (e) =>
            filter === "all" ||
            e.type === filter ||
            (filter === "settlements" &&
              (e.type === "settlement_initiated" ||
                e.type === "settlement_completed")) ||
            (filter === "webhooks" && e.type === "webhook_delivered")
        );

        if (filteredLive.length > 0) {
          setEvents((prev) => deduplicate([...filteredLive, ...prev]));
          setIsLoading(false);
          setError(null);
        }
        setConnectionStatus("connected");
      } catch {
        // ignore
      }
    };

    const EVENT_TYPES: ActivityEventType[] = [
      "payment_received",
      "settlement_initiated",
      "settlement_completed",
      "webhook_delivered",
      "api_key_used",
    ];
    EVENT_TYPES.forEach((type) => {
      es.addEventListener(type, (ev: Event) => {
        hasConnected = true;
        sseRetryCountRef.current = 0;
        if (!mountedRef.current) return;
        const msgEv = ev as MessageEvent<string>;
        try {
          const event = JSON.parse(msgEv.data) as ActivityEvent;

          const matches =
            filter === "all" ||
            (filter === "payments" && event.type === "payment_received") ||
            (filter === "settlements" &&
              (event.type === "settlement_initiated" ||
                event.type === "settlement_completed")) ||
            (filter === "webhooks" && event.type === "webhook_delivered");

          if (matches) {
            setEvents((prev) => deduplicate([event, ...prev]));
            setIsLoading(false);
            setError(null);
          }
          setConnectionStatus("connected");
        } catch {
          // ignore
        }
      });
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      if (!hasConnected || es.readyState === EventSource.CLOSED) {
        scheduleSseReconnectOrFallback();
      }
    };
  }, [limit, filter, fetchEvents, startPolling, stopPolling, closeSSE]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!merchantId) return;

    mountedRef.current = true;
    usePollFallbackRef.current = false;
    sseRetryCountRef.current = 0;
    pollErrorCountRef.current = 0;

    void fetchEvents();
    startSSE();

    const handleVisibilityChange = () => {
      if (!mountedRef.current) return;

      if (document.visibilityState === "visible") {
        if (usePollFallbackRef.current) {
          void fetchEvents({ silent: true });
        } else {
          if (
            !evsRef.current ||
            evsRef.current.readyState === EventSource.CLOSED
          ) {
            startSSE();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      closeSSE();
      stopPolling();
      setConnectionStatus("disconnected");
    };
  }, [merchantId, fetchEvents, startSSE, closeSSE, stopPolling]);

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    events,
    isLoading,
    error,
    refetch: () => void fetchEvents({ silent: true }),
    connectionStatus,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
  };
}
