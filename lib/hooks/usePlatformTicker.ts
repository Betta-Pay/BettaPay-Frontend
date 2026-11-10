import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export const MIN_TICKER_THROTTLE_MS = 1000;

export interface TickerData {
  liveVolume: number;
  liveFees: number;
  activeMerchants: number;
  tps: number;
  timestamp: string;
}

export const DEFAULT_TICKER_DATA: TickerData = {
  liveVolume: 1452310.89,
  liveFees: 14523.1,
  activeMerchants: 142,
  tps: 4.2,
  timestamp: new Date(0).toISOString(),
};

export function usePlatformTicker(
  pollIntervalMs = 3000,
  throttleMs: number = MIN_TICKER_THROTTLE_MS,
) {
  const effectiveIntervalMs =
    pollIntervalMs > 0 ? Math.max(MIN_TICKER_THROTTLE_MS, pollIntervalMs) : 0;

  const query = useQuery<TickerData, Error>({
    queryKey: ['admin', 'platform-ticker'],
    queryFn: async () => {
      const res = await apiClient.get<TickerData>('/api/admin/ticker');
      return res.data;
    },
    refetchInterval: effectiveIntervalMs > 0 ? effectiveIntervalMs : false,
  });

  const [throttledTicker, setThrottledTicker] = useState<TickerData>(
    () => query.data ?? DEFAULT_TICKER_DATA,
  );

  const lastCommitAtRef = useRef<number>(0);
  const pendingTickerRef = useRef<TickerData | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushTickerUpdate = useCallback(
    (incoming: TickerData) => {
      const now = Date.now();
      const elapsed = now - lastCommitAtRef.current;

      if (lastCommitAtRef.current === 0 || elapsed >= throttleMs) {
        if (throttleTimerRef.current !== null) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        pendingTickerRef.current = null;
        lastCommitAtRef.current = now;
        setThrottledTicker(incoming);
        return;
      }

      pendingTickerRef.current = incoming;
      if (throttleTimerRef.current === null) {
        const remainingMs = Math.max(0, throttleMs - elapsed);
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          if (pendingTickerRef.current) {
            lastCommitAtRef.current = Date.now();
            setThrottledTicker(pendingTickerRef.current);
            pendingTickerRef.current = null;
          }
        }, remainingMs);
      }
    },
    [throttleMs],
  );

  useEffect(() => {
    if (query.data) {
      pushTickerUpdate(query.data);
    }
  }, [query.data, pushTickerUpdate]);

  useEffect(() => {
    return () => {
      if (throttleTimerRef.current !== null) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, []);

  return {
    ticker: throttledTicker,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? query.error.message : null,
    refetch: () => void query.refetch(),
    pushTickerUpdate,
  };
}
