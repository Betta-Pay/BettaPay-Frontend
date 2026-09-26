'use client';

import { useEffect } from 'react';
import { useOfflineStore } from '@/lib/store/offlineStore';

/**
 * Synchronise the offline store's `isOnline` flag with the browser's real
 * `navigator.onLine` value **after** React hydration.
 *
 * The store intentionally defaults to `true` so the server-rendered HTML and
 * the initial client render agree.  This hook fires a single `useEffect` to
 * reconcile the flag with the actual browser state once the DOM is ready.
 *
 * Call this hook once in a top-level client component (e.g. AppProviders).
 * Subsequent online/offline events are already handled by `useOnlineStatus`.
 */
export function useSyncOnlineStatus(): void {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    useOfflineStore.getState().setIsOnline(navigator.onLine);
  }, []);
}
