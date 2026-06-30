'use client';

import { useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const setIsOnline = useOfflineStore((s) => s.setIsOnline);

  useEffect(() => {
    setIsOnline(isOnline);
  }, [isOnline, setIsOnline]);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-primary text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">
        You are offline. Some features may be unavailable.
      </span>
    </div>
  );
}
