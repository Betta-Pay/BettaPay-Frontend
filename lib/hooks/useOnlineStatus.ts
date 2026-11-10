'use client';

import { useEffect } from 'react';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { resolveApiBaseUrl } from '@/lib/api/axios';

export const CONNECTIVITY_BROADCAST_CHANNEL = 'betta_connectivity';

export interface ConnectivityBroadcastMessage {
  isOnline: boolean;
  isApiReachable: boolean;
  timestamp: number;
}

function createConnectivityChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }
  try {
    return new BroadcastChannel(CONNECTIVITY_BROADCAST_CHANNEL);
  } catch {
    return null;
  }
}

function postConnectivityStatus(
  channel: BroadcastChannel | null,
  isOnline: boolean,
  isApiReachable: boolean,
): void {
  if (!channel) return;
  try {
    const message: ConnectivityBroadcastMessage = {
      isOnline,
      isApiReachable,
      timestamp: Date.now(),
    };
    channel.postMessage(message);
  } catch {
    // Ignore errors if channel is already closed
  }
}

export async function pingApiHealth(): Promise<boolean> {
  const url = `${resolveApiBaseUrl()}/healthz`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 4000);
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
    const channel = createConnectivityChannel();

    const applyStatus = (nextOnline: boolean, nextReachable: boolean, broadcast: boolean) => {
      const prev = useOfflineStore.getState();
      const changed =
        prev.isOnline !== nextOnline || prev.isApiReachable !== nextReachable;
      prev.setIsOnline(nextOnline);
      prev.setIsApiReachable(nextReachable);
      if (broadcast && changed) {
        postConnectivityStatus(channel, nextOnline, nextReachable);
      }
    };

    if (channel) {
      channel.onmessage = (event: MessageEvent<ConnectivityBroadcastMessage>) => {
        if (!active || !event?.data || typeof event.data !== 'object') return;
        const { isOnline: remoteOnline, isApiReachable: remoteReachable } = event.data;
        if (typeof remoteOnline === 'boolean' && typeof remoteReachable === 'boolean') {
          applyStatus(remoteOnline, remoteReachable, false);
        }
      };
    }

    const checkHealth = async (broadcastAlways = false) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        applyStatus(false, false, true);
        if (broadcastAlways) {
          postConnectivityStatus(channel, false, false);
        }
        return;
      }

      const reachable = await pingApiHealth();
      if (!active) return;

      applyStatus(true, reachable, true);
      if (broadcastAlways) {
        postConnectivityStatus(channel, true, reachable);
      }
    };

    // Initialize/sync status on mount
    void checkHealth();

    const handleOnline = () => {
      useOfflineStore.getState().setIsOnline(true);
      void checkHealth(true);
    };

    const handleOffline = () => {
      applyStatus(false, false, true);
      postConnectivityStatus(channel, false, false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll every 10 seconds if visible
    pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkHealth();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkHealth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollInterval) clearInterval(pollInterval);
      if (channel) {
        channel.onmessage = null;
        channel.close();
      }
    };
  }, []);

  return isOnline && isApiReachable;
}
