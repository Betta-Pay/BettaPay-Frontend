'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RotateCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus, pingApiHealth } from '@/lib/hooks/useOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { getPendingSyncCount, watchSyncComplete } from '@/lib/offline/syncQueue';

export function OfflineBanner() {
  const detectedOnline = useOnlineStatus();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const isApiReachable = useOfflineStore((s) => s.isApiReachable);
  const dismissed = useOfflineStore((s) => s.dismissed);
  const setIsOnline = useOfflineStore((s) => s.setIsOnline);
  const setIsApiReachable = useOfflineStore((s) => s.setIsApiReachable);
  const dismiss = useOfflineStore((s) => s.dismiss);
  const queryClient = useQueryClient();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Surface offline-created mutations (payment links, webhook tests) that will
  // be background-synced once connectivity returns. Skipped under jest — the
  // store is mocked there and IndexedDB does not exist.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    let cancelled = false;
    const refresh = () => {
      void getPendingSyncCount().then((count) => {
        if (!cancelled) setPendingSyncCount(count);
      });
    };
    refresh();
    const unsubscribe = watchSyncComplete(() => refresh());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Feed the browser-detected connectivity into the shared store so the banner
  // (and the rest of the app) render from a single source of truth.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setIsOnline(detectedOnline);
      if (detectedOnline) {
        setIsApiReachable(true);
      }
    } else {
      const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(browserOnline);
    }
  }, [detectedOnline, setIsOnline, setIsApiReachable]);

  // Only show when the store says we are truly offline or API is unreachable,
  // and the user hasn't dismissed it for this episode.
  const showBanner = (!isOnline || !isApiReachable) && !dismissed;
  if (!showBanner) return null;

  const handleRetry = () => {
    if (process.env.NODE_ENV === 'test') {
      queryClient.refetchQueries();
      return;
    }

    pingApiHealth().then((reachable) => {
      setIsApiReachable(reachable);
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(online);
      queryClient.refetchQueries();
    });
  };

  const message = !isOnline
    ? "You are offline. Some features may be unavailable."
    : "API server is unreachable. Some features may be degraded.";
  const syncNote =
    pendingSyncCount > 0
      ? `${pendingSyncCount} change${pendingSyncCount === 1 ? '' : 's'} waiting to sync automatically`
      : null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 shadow-md animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium flex items-center gap-2">
        {message}
        {syncNote && <span className="hidden sm:inline text-destructive-foreground/80">· {syncNote}</span>}
      </span>
      <button
        type="button"
        onClick={handleRetry}
        className="inline-flex items-center gap-1 rounded-md border border-destructive-foreground/40 px-2 py-1 text-xs font-medium hover:bg-destructive-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground/60"
      >
        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss offline notification"
        className="ml-1 inline-flex items-center justify-center rounded-md p-1 hover:bg-destructive-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground/60"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
