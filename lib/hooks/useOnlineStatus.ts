'use client';

import { useEffect } from 'react';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { resolveApiBaseUrl } from '@/lib/api/axios';

const HEALTH_PING_TIMEOUT_MS = 12000;

export async function pingApiHealth(): Promise<boolean> {
  const url = `${resolveApiBaseUrl()}/api/health`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, HEALTH_PING_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);
    return res.status < 500;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): boolean {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const isApiReachable = useOfflineStore((s) => s.isApiReachable);

  useEffect(() => {
    let active = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkHealth = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        useOfflineStore.getState().setIsOnline(false);
        useOfflineStore.getState().setIsApiReachable(false);
        return;
      }

      const reachable = await pingApiHealth();
      if (!active) return;

      useOfflineStore.getState().setIsOnline(true);
      useOfflineStore.getState().setIsApiReachable(reachable);
    };

    // Initialize/sync status on mount
    checkHealth();

    const handleOnline = () => {
      useOfflineStore.getState().setIsOnline(true);
      checkHealth();
    };

    const handleOffline = () => {
      useOfflineStore.getState().setIsOnline(false);
      useOfflineStore.getState().setIsApiReachable(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll every 10 seconds if visible
    pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return isOnline && isApiReachable;
}
