'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { csrfHeader } from '@/lib/utils/csrf';
import type { PageInfo, PublicWebhookSubscription, WebhookDelivery } from './types';

export const webhookKeys = {
  all: ['admin', 'webhooks'] as const,
  list: (page: number, limit: number) => ['admin', 'webhooks', 'list', page, limit] as const,
  deliveries: (id: string) => ['admin', 'webhooks', 'deliveries', id] as const,
  dlq: ['admin', 'webhooks', 'dlq'] as const,
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init?.method && init.method !== 'GET' ? csrfHeader() : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export interface DlqEntry extends WebhookDelivery {
  subscriptionUrl: string | null;
}

export function useWebhookList(page: number, limit: number) {
  return useQuery({
    queryKey: webhookKeys.list(page, limit),
    queryFn: () =>
      request<{ data: PublicWebhookSubscription[]; pageInfo: PageInfo }>(
        `/api/admin/webhooks?page=${page}&limit=${limit}`,
      ),
    placeholderData: (prev) => prev, // keep the old page visible while the next loads
    refetchInterval: 30_000,
  });
}

export function useDeliveries(id: string | null) {
  return useQuery({
    queryKey: webhookKeys.deliveries(id ?? ''),
    queryFn: () => request<{ data: WebhookDelivery[] }>(`/api/admin/webhooks/${id}/deliveries?limit=25`),
    enabled: Boolean(id),
  });
}

export function useDlq() {
  return useQuery({
    queryKey: webhookKeys.dlq,
    queryFn: () => request<{ data: DlqEntry[]; total: number }>('/api/admin/webhooks/dlq'),
  });
}

/** Actions all return the real attempt; every one refreshes lists + history. */
function useAttemptMutation<V>(path: (v: V) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => request<{ data: WebhookDelivery }>(path(v), { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export const useSendTest = () => useAttemptMutation<string>((id) => `/api/admin/webhooks/${id}/test`);
export const useReplayLatest = () => useAttemptMutation<string>((id) => `/api/admin/webhooks/${id}/replay`);
export function useRetryDlq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      request<{ data: WebhookDelivery; resolved: boolean }>(
        `/api/admin/webhooks/dlq/${deliveryId}/retry`,
        { method: 'POST' },
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}
