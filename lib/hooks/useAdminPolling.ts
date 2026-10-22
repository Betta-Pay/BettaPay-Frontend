'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminGet } from '@/lib/admin/client';
import { useAdminAccess, useAdminOnline } from '@/components/admin/AdminAccess';

export function useAdminPolling<T>(key: readonly unknown[], path: string, interval = 20000, enabled = true) {
  const allowed = useAdminAccess();
  const online = useAdminOnline();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return useQuery<T>({ queryKey: key, queryFn: ({ signal }) => adminGet<T>(path, signal),
    enabled: allowed && enabled && online,
    refetchOnWindowFocus: true,
    refetchInterval: visible && online ? interval : false, refetchIntervalInBackground: false,
  });
}
