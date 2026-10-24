'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, RotateCw, X, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus, pingApiHealth } from '@/lib/hooks/useOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';

const RECONNECTED_DISPLAY_MS = 3000;

export function OfflineBanner() {
  const detectedOnline = useOnlineStatus();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const isApiReachable = useOfflineStore((s) => s.isApiReachable);
  const dismissed = useOfflineStore((s) => s.dismissed);
  const setIsOnline = useOfflineStore((s) => s.setIsOnline);
  const setIsApiReachable = useOfflineStore((s) => s.setIsApiReachable);
  const dismiss = useOfflineStore((s) => s.dismiss);
  const queryClient = useQueryClient();

  const [isRetrying, setIsRetrying] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasDisconnectedRef = useRef(false);

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

  const disconnected = !isOnline || !isApiReachable;

  // Track disconnect episodes; when we transition back to connected after an
  // episode, show a brief success notice before it auto-dismisses.
  useEffect(() => {
    if (disconnected) {
      wasDisconnectedRef.current = true;
      setShowReconnected(false);
      return;
    }
    if (wasDisconnectedRef.current) {
      wasDisconnectedRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), RECONNECTED_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  }, [disconnected]);

  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-[60] bg-green-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">Connection restored</span>
      </div>
    );
  }

  // Only show when the store says we are truly offline or API is unreachable,
  // and the user hasn't dismissed it for this episode.
  const showBanner = disconnected && !dismissed;
  if (!showBanner) return null;

  const handleRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);

    if (process.env.NODE_ENV === 'test') {
      queryClient.refetchQueries();
      setIsRetrying(false);
      return;
    }

    pingApiHealth()
      .then((reachable) => {
        setIsApiReachable(reachable);
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        setIsOnline(online);
        queryClient.refetchQueries();
      })
      .finally(() => setIsRetrying(false));
  };

  const message = !isOnline
    ? "You are offline. Some features may be unavailable."
    : "API server is unreachable. Some features may be degraded.";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] bg-destructive text-destructive-foreground px-4 py-2.5 flex items-center justify-center gap-3 shadow-md animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">
        {message}
      </span>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-1 rounded-md border border-destructive-foreground/40 px-2 py-1 text-xs font-medium hover:bg-destructive-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive-foreground/60 disabled:opacity-60"
      >
        <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isRetrying ? 'Checking...' : 'Retry Connection'}
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
