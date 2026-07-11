'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  // Always initialize to true to match SSR and prevent hydration mismatches
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync with the actual browser status on mount
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
