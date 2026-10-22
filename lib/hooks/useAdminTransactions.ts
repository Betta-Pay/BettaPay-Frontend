'use client';
import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminGet } from '@/lib/admin/client';
import type { CursorPage } from '@/lib/admin/types';
import type { ApiPayment } from '@/lib/api/hooks';
import { useAdminAccess, useAdminOnline } from '@/components/admin/AdminAccess';

export interface AdminTransaction extends ApiPayment { asset: string; kind: 'payment' | 'settlement' }
export function useAdminTransactions(filters: Record<string, string>, pollMs = 15000) {
  const allowed = useAdminAccess();
  const online = useAdminOnline();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible');
    update(); document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  const query = useInfiniteQuery({
    queryKey: ['admin', 'transactions', filters], enabled: allowed && online,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ ...filters, limit: '100' });
      if (pageParam) params.set('cursor', pageParam);
      return adminGet<CursorPage<AdminTransaction>>(`/api/admin/transactions?${params}`, signal);
    },
    getNextPageParam: (page, _pages, _param, params) => page.nextCursor && !params.includes(page.nextCursor) ? page.nextCursor : undefined,
    refetchInterval: visible && online && pollMs > 0 ? Math.max(5000, pollMs) : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const transactions = useMemo(() => [...new Map(query.data?.pages.flatMap(p => p.data).map(t => [t.id, t])).values()], [query.data]);
  return { ...query, transactions };
}
