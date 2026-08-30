"use client";

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from './axios';
import type {
  AuthSession,
  AuthSessionsResponse,
  MerchantProfile,
  MerchantBankAccount,
} from '../types';
import { getErrorMessage } from '../utils/apiError';
import { normalizePaymentStatus } from '../utils/constants';
// Referenced only behind the `NODE_ENV !== 'production'` guard in
// `useAdminStats`, so this import is tree-shaken out of production builds.
import { MOCK_ADMIN_STATS } from './fixtures/adminStats';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiPayment {
  id: string;
  txHash: string | null;
  payerAddress: string | null;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  fxRate: number | null;
  status: string;
  source: string | null;
  createdAt: string;
  stellarOpId?: string | null;
  url?: string;
  clicks?: number;
  converted?: number;
}

export interface SettlementEffectiveRule {
  feeBps: number;
  autoSettle: boolean;
  delay: number;
  source: 'merchant' | 'default' | 'governance';
}

export interface ApiSettlement {
  id: string;
  merchantId: string;
  amountUsdc: number;
  amountNgn: number | null;
  status: string;
  createdAt: string;
  txHash: string | null;
  bankName: string | null;
  accountNumber: string | null;
  effectiveRule?: SettlementEffectiveRule | null;
}

export type SettlementAction = 'approve' | 'reject' | 'hold';

export interface SettlementActionResult {
  id: string;
  success: boolean;
  status: string;
  error: string | null;
}

export interface SettlementBulkActionResponse {
  summary: {
    requested: number;
    succeeded: number;
    failed: number;
  };
  results: SettlementActionResult[];
}

export interface AdminStats {
  totalProcessed: number;
  totalProcessedChangePct: number;
  platformFees: number;
  feeRatePct: number;
  activeMerchants: number;
  newMerchantsThisWeek: number;
  pendingKyb: number;
}

export interface ApiRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  trend: 'up' | 'down';
}

export interface AuthSessionsState {
  active: AuthSession[];
  history: AuthSession[];
}

// Response envelopes used by the backend. Both shapes are accepted so
// the hooks tolerate response drift between `data: T[]` and a bare array.
interface RatesResponse {
  rates: ApiRate[];
  usdcNgn?: number;
}

interface ListEnvelope<T> {
  data: T[];
}

interface ItemEnvelope<T> {
  data: T;
}

// Unified public shape: keeps existing consumers happy while delegating
// network plumbing to React Query (which provides dedup + caching). The
// `refetch` contract is intentionally a parameter-bare `() => void` so it
// can be passed straight to DOM `onClick` handlers (React Query's native
// refetch takes optional options and returns a `Promise<QueryObserverResult>`,
// which is awkward to assign to event handlers — and no caller in this
// codebase uses the returned promise anyway).
interface HookShape<T> {
  data: T;
  isLoading: boolean;
  /** True while a background refetch is in flight (does not flip on initial load). */
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

function mapQuery<T>(
  result: UseQueryResult<T, Error>,
  fallback: T,
): HookShape<T> {
  return {
    data: (result.data ?? fallback) as T,
    isLoading: result.isLoading,
    isFetching: result.isFetching && !result.isLoading,
    error: result.isError ? getErrorMessage(result.error) : null,
    refetch: () => {
      // Fire-and-forget: the underlying call is already deduped by RQ.
      void result.refetch();
    },
  };
}

// Query keys are exported so callers can prefetch or invalidate caches
// without relearning the underlying structure.
export const queryKeys = {
  payments: ['payments'] as const,
  settlements: ['settlements'] as const,
  rates: ['rates'] as const,
  authSessions: ['auth', 'sessions'] as const,
  merchant: (id?: string) => ['merchant', id ?? null] as const,
  adminStats: ['admin', 'stats'] as const,
};

// ─── useAuthSessions ─────────────────────────────────────────────────────────

export function useAuthSessions(): {
  data: AuthSessionsState;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  revokeSession: (sessionId: string) => Promise<void>;
  isRevoking: boolean;
} {
  const queryClient = useQueryClient();
  const query = useQuery<AuthSessionsResponse, Error>({
    queryKey: queryKeys.authSessions,
    queryFn: async () => {
      const res = await apiClient.get<
        AuthSessionsResponse | { data: AuthSessionsResponse }
      >('/api/auth/sessions');
      const payload = res.data;

      if ('active' in payload && 'history' in payload) {
        return payload;
      }

      return payload.data;
    },
  });

  const revokeMutation = useMutation<void, Error, string>({
    mutationFn: async (sessionId) => {
      await apiClient.delete(`/api/auth/sessions/${encodeURIComponent(sessionId)}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.authSessions });
    },
  });

  return {
    data: query.data ?? { active: [], history: [] },
    isLoading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    revokeSession: (sessionId) => revokeMutation.mutateAsync(sessionId),
    isRevoking: revokeMutation.isPending,
  };
}

// ─── useAdminStats ────────────────────────────────────────────────────────────

// Dev-only, opt-in sample data. `/api/admin/stats` is not deployed in every
// local environment, so `NEXT_PUBLIC_ADMIN_STATS_SAMPLE_FALLBACK=true` lets a
// developer keep the overview readable while the service is missing. The
// `NODE_ENV !== 'production'` half of this guard is statically false in a
// production build, so the `MOCK_ADMIN_STATS` import below is dead-code
// eliminated and tree-shaken out of the production bundle.
const ADMIN_STATS_SAMPLE_FALLBACK =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_ADMIN_STATS_SAMPLE_FALLBACK === 'true';

export interface AdminStatsHook {
  /** Real figures from the API, or `null` when they cannot be loaded. */
  data: AdminStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /**
   * `true` when `data` holds illustrative sample figures rather than real
   * platform metrics. Consumers MUST surface a visible indicator when set.
   * Always `false` in production builds.
   */
  isSampleData: boolean;
}

export function useAdminStats(): AdminStatsHook {
  const query = useQuery<AdminStats, Error>({
    queryKey: queryKeys.adminStats,
    queryFn: async () => {
      const res = await apiClient.get<ItemEnvelope<AdminStats> | AdminStats>(
        '/api/admin/stats',
      );
      const payload = res.data;
      if (payload && 'totalProcessed' in payload) {
        return payload as AdminStats;
      }
      const unwrapped = (payload as ItemEnvelope<AdminStats> | undefined)?.data;
      if (!unwrapped) throw new Error('Malformed admin stats response');
      return unwrapped;
    },
  });

  const isSampleData =
    ADMIN_STATS_SAMPLE_FALLBACK && query.isError && query.data === undefined;

  return {
    data: isSampleData ? MOCK_ADMIN_STATS : (query.data ?? null),
    isLoading: query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    isSampleData,
  };
}

// ─── usePayments ──────────────────────────────────────────────────────────────

export function usePayments(): HookShape<ApiPayment[]> {
  const query = useQuery<ApiPayment[], Error>({
    queryKey: queryKeys.payments,
    queryFn: async () => {
      const res = await apiClient.get<ListEnvelope<ApiPayment> | ApiPayment[]>(
        '/api/payments',
      );
      const payload = res.data;
      const raw: ApiPayment[] = Array.isArray(payload)
        ? payload
        : ((payload as ListEnvelope<ApiPayment> | undefined)?.data ?? []);
      // Normalise status at the ingestion boundary so every consumer receives
      // canonical vocabulary regardless of what the API or mock returns.
      return raw.map((p) => ({ ...p, status: normalizePaymentStatus(p.status) }));
    },
  });
  return mapQuery(query, []);
}

// ─── useSettlements ───────────────────────────────────────────────────────────

export function useSettlements(): HookShape<ApiSettlement[]> {
  const query = useQuery<ApiSettlement[], Error>({
    queryKey: queryKeys.settlements,
    queryFn: async () => {
      const res = await apiClient.get<ListEnvelope<ApiSettlement> | ApiSettlement[]>(
        '/api/settlements',
      );
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      return (payload as ListEnvelope<ApiSettlement> | undefined)?.data ?? [];
    },
  });
  return mapQuery(query, []);
}

// ─── useSettlementBulkAction ────────────────────────────────────────────────

export function useSettlementBulkAction() {
  const queryClient = useQueryClient();
  return useMutation<SettlementBulkActionResponse, Error, { action: SettlementAction; settlementIds: string[] }>({
    mutationFn: async ({ action, settlementIds }) => {
      const res = await apiClient.post<SettlementBulkActionResponse>('/api/settlements/actions', {
        action,
        settlementIds,
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements });
    },
  });
}

// ─── useRates ─────────────────────────────────────────────────────────────────

export interface UseRatesResult extends HookShape<ApiRate[]> {
  primaryRate: number | null;
}

export function useRates(): UseRatesResult {
  const query = useQuery<RatesResponse, Error>({
    queryKey: queryKeys.rates,
    queryFn: async () => {
      const res = await apiClient.get<RatesResponse>('/api/rates');
      return res.data ?? { rates: [] };
    },
  });

  const rates: ApiRate[] = query.data?.rates ?? [];
  const primaryRate = useMemo(
    () =>
      query.data?.usdcNgn ??
      rates.find((r) => r.from === 'USDC' && r.to === 'NGN')?.rate ??
      null,
    [query.data, rates],
  );

  return {
    data: rates,
    isLoading: query.isLoading,
    // Mirror `mapQuery`: "fetching" means a background refetch, not the first load.
    isFetching: query.isFetching && !query.isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
    primaryRate,
  };
}

// ─── useMerchantBankAccount ────────────────────────────────────────────────────

export function useMerchantBankAccount(
  merchantId: string | undefined,
): HookShape<MerchantBankAccount | null> {
  const query = useQuery<MerchantBankAccount | null, Error>({
    queryKey: [...queryKeys.merchant(merchantId), 'bank-account'],
    enabled: Boolean(merchantId),
    queryFn: async () => {
      const res = await apiClient.get<
        ItemEnvelope<MerchantBankAccount> | MerchantBankAccount
      >(`/api/merchants/${merchantId}/bank-account`);
      const payload = res.data;
      if (payload && !Array.isArray(payload) && 'bankName' in payload) {
        return payload as MerchantBankAccount;
      }
      return (payload as ItemEnvelope<MerchantBankAccount> | undefined)?.data ?? null;
    },
  });

  const isLoading = query.isLoading;

  return {
    data: query.data ?? null,
    isLoading,
    isFetching: query.isFetching && !isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── useMerchantProfile ───────────────────────────────────────────────────────

export function useMerchantProfile(
  merchantId: string | undefined,
): HookShape<MerchantProfile | null> {
  const query = useQuery<MerchantProfile | null, Error>({
    queryKey: queryKeys.merchant(merchantId),
    enabled: Boolean(merchantId),
    queryFn: async () => {
      const res = await apiClient.get<ItemEnvelope<MerchantProfile> | MerchantProfile>(
        `/api/merchants/${merchantId}`,
      );
      const payload = res.data;
      if (payload && !Array.isArray(payload) && 'businessName' in payload) {
        return payload as MerchantProfile;
      }
      return (payload as ItemEnvelope<MerchantProfile> | undefined)?.data ?? null;
    },
  });

  // React Query v5 already reports isLoading=false for disabled queries
  // (no fetch in flight), so we just forward `query.isLoading` directly.
  const isLoading = query.isLoading;

  return {
    data: query.data ?? null,
    isLoading,
    isFetching: query.isFetching && !isLoading,
    error: query.isError ? getErrorMessage(query.error) : null,
    refetch: () => {
      void query.refetch();
    },
  };
}

// ─── KYB types ────────────────────────────────────────────────────────────────

export interface KybDocument {
  id: string;
  type: string;
  label: string;
  url: string | null;
  uploadedAt: string;
  verified: boolean;
}

export interface MerchantKybProfile {
  merchantId: string;
  businessName: string;
  businessType: string;
  country: string;
  industry: string;
  contactEmail: string;
  phoneNumber: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  websiteUrl: string | null;
  kybStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  documents: KybDocument[];
}

export interface AuditLogEntry {
  id: string;
  entityType: 'MERCHANT';
  entityId: string;
  action: 'KYB_APPROVED' | 'KYB_REJECTED' | 'KYB_REVIEW';
  reviewerId: string;
  reviewerEmail: string;
  decision: 'approved' | 'rejected';
  note: string | null;
  createdAt: string;
}

// ─── useKybMerchants ──────────────────────────────────────────────────────────

export function useKybMerchants(status?: string): HookShape<MerchantKybProfile[]> {
  const query = useQuery<MerchantKybProfile[], Error>({
    queryKey: ['admin', 'kyb-list', status ?? 'all'],
    queryFn: async () => {
      const params = status && status !== 'all' ? `?status=${status}` : '';
      const res = await apiClient.get<{ data: MerchantKybProfile[] }>(
        `/api/admin/merchants/kyb${params}`,
      );
      return res.data?.data ?? [];
    },
  });
  return mapQuery(query, []);
}

// ─── useAuditLog ──────────────────────────────────────────────────────────────

export function useAuditLog(options?: {
  action?: string;
  entityId?: string;
  limit?: number;
}): HookShape<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (options?.action) params.set('action', options.action);
  if (options?.entityId) params.set('entityId', options.entityId);
  if (options?.limit) params.set('limit', String(options.limit));

  const query = useQuery<AuditLogEntry[], Error>({
    queryKey: ['admin', 'audit', options],
    queryFn: async () => {
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get<{ data: AuditLogEntry[] }>(
        `/api/admin/audit${qs}`,
      );
      return res.data?.data ?? [];
    },
  });
  return mapQuery(query, []);
}
