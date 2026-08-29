"use client";

/**
 * useSystemHealth
 *
 * Polls a health endpoint on a configurable interval. Defaults to the
 * admin-only /api/admin/health; the public status page passes the
 * unauthenticated /api/status/health instead.
 * Implements the Page Visibility API to pause polling when the tab is
 * hidden, preserves the last known successful payload across errors, and
 * cleans up all timers on unmount.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { HealthResponse } from "@/lib/types/health";

export const POLL_INTERVAL_MS = 20_000; // 20 s — matches requirement range

/** Admin-guarded aggregated health endpoint. */
export const ADMIN_HEALTH_ENDPOINT = "/api/admin/health";
/** Public, unauthenticated health endpoint used by the status page. */
export const PUBLIC_HEALTH_ENDPOINT = "/api/status/health";

export type UseSystemHealthReturn = {
  /** Most recent health payload (may be stale if a refetch failed). */
  data: HealthResponse | null;
  /** True during the very first fetch (no data yet). */
  loading: boolean;
  /** Non-null when the latest fetch failed. Previous data is still available. */
  error: string | null;
  /** ISO timestamp of the last successful fetch. */
  lastSuccessAt: string | null;
  /** Imperatively trigger an immediate refresh. */
  refresh: () => void;
};

export function useSystemHealth(
  endpoint: string = ADMIN_HEALTH_ENDPOINT,
): UseSystemHealthReturn {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchHealth = useCallback(async () => {
    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(endpoint, {
        signal: abortRef.current.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Health endpoint returned ${res.status}`);
      }

      const json: HealthResponse = await res.json();

      if (!mountedRef.current) return;

      setData(json);
      setError(null);
      setLastSuccessAt(new Date().toISOString());
    } catch (err) {
      if (!mountedRef.current) return;
      // AbortError is expected when we cancel — do not treat as an error.
      if (err instanceof DOMException && err.name === "AbortError") return;

      const msg =
        err instanceof Error ? err.message : "Failed to fetch health data";
      setError(msg);
      // Do NOT clear `data` — preserve last known state.
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [endpoint]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(() => {
      // Only poll when the tab is visible.
      if (document.visibilityState === "visible") {
        fetchHealth();
      }
    }, POLL_INTERVAL_MS);
  }, [fetchHealth]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Page Visibility API — pause while hidden, resume on show.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        fetchHealth(); // immediate fetch on returning
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchHealth, startPolling, stopPolling]);

  // Initial fetch + start polling on mount.
  useEffect(() => {
    mountedRef.current = true;
    fetchHealth();
    startPolling();

    return () => {
      mountedRef.current = false;
      stopPolling();
      abortRef.current?.abort();
    };
  }, [fetchHealth, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    setLoading((prev) => (prev ? prev : false)); // Don't show full-screen loader on manual refresh
    fetchHealth();
  }, [fetchHealth]);

  return { data, loading, error, lastSuccessAt, refresh };
}
