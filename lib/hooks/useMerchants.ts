'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGet, adminPost } from '@/lib/admin/client';
import type { AdminMerchant, CursorPage } from '@/lib/admin/types';
import { useAdminAccess } from '@/components/admin/AdminAccess';
import { queryKeys } from '@/lib/api/hooks';

export function useMerchants(filters: { search: string; status: string; kycStatus: string }) {
  const enabled = useAdminAccess();
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['admin', 'merchants', filters], enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: '25' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      if (pageParam) params.set('cursor', pageParam);
      return adminGet<CursorPage<AdminMerchant>>(`/api/admin/merchants?${params}`, signal);
    },
    getNextPageParam: (page, _pages, _param, params) => page.nextCursor && !params.includes(page.nextCursor) ? page.nextCursor : undefined,
  });
  const action = useMutation({
    mutationFn: (body: { merchantIds: string[]; action: string; reviewerId?: string }) => adminPost<{ results?: { id: string; success: boolean; error?: string }[] }>('/api/admin/merchants', body),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin', 'merchants'] }),
        client.invalidateQueries({ queryKey: ['admin', 'merchant'] }),
        client.invalidateQueries({ queryKey: queryKeys.payments }),
        client.invalidateQueries({ queryKey: queryKeys.settlements }),
        client.invalidateQueries({ queryKey: ['admin', 'compliance'] }),
        client.invalidateQueries({ queryKey: queryKeys.adminStats }),
      ]);
    },
  });
  return { ...query, merchants: [...new Map(query.data?.pages.flatMap(p => p.data).map(m => [m.id, m])).values()], action };
}
