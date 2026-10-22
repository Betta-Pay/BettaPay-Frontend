"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IpListResponse } from "./types";

export const IP_POLL_INTERVAL_MS = 15_000;

/**
 * Polls the tracked-IP list. Pauses while the tab is hidden and refetches
 * immediately on return; keeps the last good payload across errors.
 */
export function useIpScores(q: string, intervalMs = IP_POLL_INTERVAL_MS) {
  const [data, setData] = useState<IpListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(`/api/admin/security/ip-scores?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`IP scores returned ${res.status}`);
      const json = (await res.json()) as IpListResponse;
      if (controller.signal.aborted) return;
      setData(json);
      setError(null);
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      setError(err instanceof Error ? err.message : "Failed to load IP scores");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const stop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => void fetchList(), intervalMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        void fetchList();
        start();
      }
    };

    void fetchList();
    if (document.visibilityState !== "hidden") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      abortRef.current?.abort();
    };
  }, [fetchList, intervalMs]);

  return { data, loading, error, refresh: fetchList };
}
