/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  usePayments,
  useSettlements,
  useRates,
  useMerchantProfile,
  useAdminStats,
  queryKeys,
} from '@/lib/api/hooks';
import { apiClient } from '@/lib/api/axios';

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
  // Capture so tests can assert against the cache directly.
  (makeWrapper as any).__cache = client;
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

// Portable micro-task flush: setImmediate isn't part of the jsdom spec, so
// we use a 0ms timeout which behaves the same on Node and in browsers.
const flushPromises = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  mockedGet.mockReset();
});

describe('usePayments', () => {
  it('fetches /api/payments and returns the inner data array', async () => {
    const data = [{ id: 'pay_1', amountUsdc: 10, amountNgn: 15000, status: 'completed', createdAt: 'now', merchantId: 'm' }];
    mockedGet.mockResolvedValue({ data: { data } });

    const { result } = renderHook(() => usePayments(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(data);
    expect(result.current.error).toBeNull();
    expect(mockedGet).toHaveBeenCalledWith('/api/payments');
  });

  it('accepts a bare-array response and surfaces it as data', async () => {
    const data = [{ id: 'pay_2', amountUsdc: 5, amountNgn: 0, status: 'pending', createdAt: 'now', merchantId: 'm' }];
    mockedGet.mockResolvedValue({ data });

    const { result } = renderHook(() => usePayments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(data);
  });

  it('defaults data to an empty array during loading and on error', async () => {
    mockedGet.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => usePayments(), { wrapper: makeWrapper() });
    expect(result.current.data).toEqual([]);
    await waitFor(() => expect(result.current.error).toBe('boom'));
    expect(result.current.data).toEqual([]);
  });

  it('deduplicates concurrent renders — a single network call is made', async () => {
    mockedGet.mockResolvedValue({ data: { data: [] } });
    const wrapper = makeWrapper();

    const { result: r1, rerender: rerender1 } = renderHook(() => usePayments(), { wrapper });
    const { result: r2, rerender: rerender2 } = renderHook(() => usePayments(), { wrapper });

    rerender1();
    rerender2();
    await waitFor(() => expect(r1.current.isLoading).toBe(false));
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(mockedGet).toHaveBeenCalledTimes(1);
  });
});

describe('useSettlements', () => {
  it('fetches /api/settlements and returns the inner data array', async () => {
    const data = [{ id: 'set_1', merchantId: 'm', amountUsdc: 12, amountNgn: null, status: 'PENDING', createdAt: 'now', txHash: null, bankName: null, accountNumber: null }];
    mockedGet.mockResolvedValue({ data: { data } });

    const { result } = renderHook(() => useSettlements(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(data);
    expect(mockedGet).toHaveBeenCalledWith('/api/settlements');
  });
});

describe('useRates', () => {
  it('exposes primaryRate from usdcNgn when present', async () => {
    const rates = [{ from: 'USDC', to: 'NGN', rate: 1500, change: 0, trend: 'up' as const }];
    mockedGet.mockResolvedValue({ data: { rates, usdcNgn: 1550 } });

    const { result } = renderHook(() => useRates(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.primaryRate).toBe(1550);
    expect(result.current.data).toEqual(rates);
  });

  it('falls back to the USDC/NGN pair when usdcNgn is not provided', async () => {
    const rates = [{ from: 'USDC', to: 'NGN', rate: 1610, change: 1.2, trend: 'up' as const }];
    mockedGet.mockResolvedValue({ data: { rates } });

    const { result } = renderHook(() => useRates(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.primaryRate).toBe(1610);
  });

  it('returns null primaryRate when no rates match', async () => {
    mockedGet.mockResolvedValue({ data: { rates: [] } });
    const { result } = renderHook(() => useRates(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.primaryRate).toBeNull();
  });
});

describe('useMerchantProfile', () => {
  it('does not fetch when merchantId is undefined', async () => {
    const { result } = renderHook(() => useMerchantProfile(undefined), {
      wrapper: makeWrapper(),
    });
    await flushPromises();
    expect(mockedGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
    // Loading is suppressed while the query is disabled so the UI does
    // not spin forever waiting for an ID that will never arrive.
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches /api/merchants/:id and returns the inner data', async () => {
    const profile = { businessName: 'Acme', businessType: 'llc', country: 'Nigeria', industry: 'tech', websiteUrl: null, contactEmail: 'a@b', phoneNumber: null, logoUrl: null };
    mockedGet.mockResolvedValue({ data: { data: profile } });

    const { result } = renderHook(() => useMerchantProfile('m_1'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual(profile);
    expect(mockedGet).toHaveBeenCalledWith('/api/merchants/m_1');
  });
});

describe('useAdminStats', () => {
  const stats = {
    totalProcessed: 500,
    totalProcessedChangePct: 3,
    platformFees: 5,
    feeRatePct: 1,
    activeMerchants: 10,
    newMerchantsThisWeek: 1,
    pendingKyb: 2,
  };

  it('returns real figures from the API and flags them as non-sample', async () => {
    mockedGet.mockResolvedValue({ data: { data: stats } });

    const { result } = renderHook(() => useAdminStats(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(stats);
    expect(result.current.isSampleData).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockedGet).toHaveBeenCalledWith('/api/admin/stats');
  });

  it('exposes null data and an error (never fabricated figures) when the endpoint fails', async () => {
    mockedGet.mockRejectedValue(new Error('endpoint down'));

    const { result } = renderHook(() => useAdminStats(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.error).toBe('endpoint down'));

    expect(result.current.data).toBeNull();
    expect(result.current.isSampleData).toBe(false);
  });
});

describe('queryKeys', () => {
  it('exposes stable, collision-free keys for each query', () => {
    expect(queryKeys.payments).toEqual(['payments']);
    expect(queryKeys.settlements).toEqual(['settlements']);
    expect(queryKeys.rates).toEqual(['rates']);
    expect(queryKeys.merchant('m_1')).toEqual(['merchant', 'm_1']);
    expect(queryKeys.merchant(undefined)).toEqual(['merchant', null]);
  });
});
