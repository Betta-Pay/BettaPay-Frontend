'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { createAsset, deleteAsset, fetchAssets, updateAsset } from './api';
import type { CreateAssetInput, SupportedAsset, UpdateAssetInput } from './types';

/**
 * Query keys. `all` is the prefix both lists share, so one
 * `invalidateQueries({ queryKey: assetKeys.all })` refreshes the admin table
 * and every merchant-facing selector at once.
 */
export const assetKeys = {
  all: ['assets'] as const,
  enabled: ['assets', 'enabled'] as const,
  admin: ['assets', 'admin'] as const,
};

/** Merchants see a change within this window without a reload or redeploy. */
const ENABLED_REFETCH_MS = 60_000;

/** Enabled assets only: what every merchant-facing currency picker lists. */
export function useEnabledAssets() {
  const query = useQuery<SupportedAsset[], Error>({
    queryKey: assetKeys.enabled,
    queryFn: async () => (await fetchAssets()).filter((a) => a.enabled),
    staleTime: 15_000,
    refetchInterval: ENABLED_REFETCH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const codes = useMemo(() => new Set((query.data ?? []).map((a) => a.code)), [query.data]);
  return { ...query, codes };
}

/** Every asset, enabled or not, for the admin table. */
export function useAdminAssets() {
  return useQuery<SupportedAsset[], Error>({
    queryKey: assetKeys.admin,
    queryFn: () => fetchAssets({ includeInactive: true }),
    staleTime: 0,
    retry: 1,
  });
}

type Snapshot = Array<[readonly unknown[], SupportedAsset[] | undefined]>;

/**
 * Apply `edit` to every cached asset list and return the previous values so a
 * failed request can put them back exactly.
 */
async function applyOptimistic(
  qc: QueryClient,
  edit: (rows: SupportedAsset[], key: readonly unknown[]) => SupportedAsset[],
): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: assetKeys.all });
  const snapshot: Snapshot = qc.getQueriesData<SupportedAsset[]>({ queryKey: assetKeys.all });
  for (const [key, rows] of snapshot) {
    if (rows) qc.setQueryData<SupportedAsset[]>(key, edit(rows, key));
  }
  return snapshot;
}

function rollback(qc: QueryClient, snapshot: Snapshot | undefined) {
  for (const [key, rows] of snapshot ?? []) qc.setQueryData(key, rows);
}

const isEnabledKey = (key: readonly unknown[]) => key[1] === 'enabled';

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation<SupportedAsset, Error, CreateAssetInput, { snapshot: Snapshot }>({
    mutationFn: createAsset,
    onMutate: async (input) => {
      const optimistic: SupportedAsset = {
        code: input.code,
        name: input.name,
        issuer: input.issuer,
        decimals: input.decimals,
        enabled: input.enabled,
        createdAt: new Date().toISOString(),
      };
      const snapshot = await applyOptimistic(qc, (rows, key) =>
        isEnabledKey(key) && !optimistic.enabled ? rows : [...rows, optimistic],
      );
      return { snapshot };
    },
    onError: (_err, _input, ctx) => rollback(qc, ctx?.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation<
    SupportedAsset,
    Error,
    { code: string; patch: UpdateAssetInput },
    { snapshot: Snapshot }
  >({
    mutationFn: ({ code, patch }) => updateAsset(code, patch),
    onMutate: async ({ code, patch }) => {
      const snapshot = await applyOptimistic(qc, (rows, key) => {
        const next = rows.map((a) => (a.code === code ? { ...a, ...patch } : a));
        // The merchant list only ever holds enabled assets.
        return isEnabledKey(key) ? next.filter((a) => a.enabled) : next;
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => rollback(qc, ctx?.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation<void, Error, string, { snapshot: Snapshot }>({
    mutationFn: deleteAsset,
    onMutate: async (code) => ({
      snapshot: await applyOptimistic(qc, (rows) => rows.filter((a) => a.code !== code)),
    }),
    onError: (_err, _code, ctx) => rollback(qc, ctx?.snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: assetKeys.all }),
  });
}
