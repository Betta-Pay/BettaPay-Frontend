import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';
import { normalizeAsset, toCreateBody, toUpdateBody } from '../types';
import { assetFormSchema } from '../validation';
import { assetKeys, useAdminAssets, useCreateAsset, useEnabledAssets, useUpdateAsset } from '../hooks';

jest.mock('@/lib/api/axios', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as unknown as Record<'get' | 'post' | 'patch' | 'delete', jest.Mock>;

const USDC = { code: 'USDC', contractId: 'CUSDC', decimals: 7, name: 'USD Coin', isActive: true };
const XLM = { code: 'XLM', contractId: 'CXLM', decimals: 7, name: 'Stellar Lumens', isActive: true };
const USDT = { code: 'USDT', contractId: 'CUSDT', decimals: 7, name: 'Tether', isActive: false };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => jest.resetAllMocks());

describe('asset wire mapping', () => {
  it('maps backend names to UI names', () => {
    expect(normalizeAsset(USDC)).toEqual({
      code: 'USDC', name: 'USD Coin', issuer: 'CUSDC', decimals: 7, enabled: true, createdAt: null,
    });
  });

  it('maps UI names back to the backend body and only sends changed keys', () => {
    expect(toCreateBody({ code: 'A', name: 'A', issuer: 'CA', decimals: 2, enabled: false })).toEqual({
      code: 'A', name: 'A', contractId: 'CA', decimals: 2, isActive: false,
    });
    expect(toUpdateBody({ enabled: false })).toEqual({ isActive: false });
  });
});

describe('assetFormSchema', () => {
  const ok = { code: 'USDC', name: 'USD Coin', issuer: 'CABC', decimals: 7, enabled: true };
  it('accepts a valid asset', () => expect(assetFormSchema.safeParse(ok).success).toBe(true));
  it.each([
    ['lowercase code', { code: 'usdc' }],
    ['empty issuer', { issuer: ' ' }],
    ['issuer with spaces', { issuer: 'C A' }],
    ['fractional decimals', { decimals: 1.5 }],
    ['NaN decimals', { decimals: NaN }],
    ['too many decimals', { decimals: 19 }],
  ])('rejects %s', (_n, patch) => expect(assetFormSchema.safeParse({ ...ok, ...patch }).success).toBe(false));
});

describe('asset queries', () => {
  it('lists only enabled assets for merchants and sends no includeInactive flag', async () => {
    api.get.mockResolvedValue({ data: { data: [USDC, USDT] } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useEnabledAssets(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.map((a) => a.code)).toEqual(['USDC']);
    expect(api.get).toHaveBeenCalledWith('/api/assets', { params: undefined });
  });

  it('asks for inactive assets in the admin table', async () => {
    api.get.mockResolvedValue({ data: { data: [USDC, USDT] } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAdminAssets(), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(api.get).toHaveBeenCalledWith('/api/assets', { params: { includeInactive: true } });
  });
});

describe('asset mutations', () => {
  it('creating an asset shows it in the merchant list immediately and invalidates the shared cache', async () => {
    api.get.mockResolvedValue({ data: { data: [USDC] } });
    let resolvePost!: (v: unknown) => void;
    api.post.mockReturnValue(new Promise((r) => (resolvePost = r)));
    const { client, wrapper } = setup();
    const merchant = renderHook(() => useEnabledAssets(), { wrapper });
    const admin = renderHook(() => useAdminAssets(), { wrapper });
    const create = renderHook(() => useCreateAsset(), { wrapper });
    await waitFor(() => expect(merchant.result.current.data).toHaveLength(1));
    await waitFor(() => expect(admin.result.current.data).toHaveLength(1));

    // Server list after the create lands.
    api.get.mockResolvedValue({ data: { data: [USDC, XLM] } });
    const spy = jest.spyOn(client, 'invalidateQueries');
    act(() => {
      create.result.current.mutate({ code: 'XLM', name: 'Stellar Lumens', issuer: 'CXLM', decimals: 7, enabled: true });
    });

    // Optimistic: visible before the POST resolves.
    await waitFor(() => expect(merchant.result.current.data?.map((a) => a.code)).toEqual(['USDC', 'XLM']));
    expect(admin.result.current.data?.map((a) => a.code)).toEqual(['USDC', 'XLM']);
    expect(api.post).toHaveBeenCalledWith('/api/admin/assets', expect.objectContaining({ contractId: 'CXLM', isActive: true }));

    await act(async () => resolvePost({ data: { data: { ...XLM, createdAt: '2026-10-22T00:00:00Z' } } }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: assetKeys.all }));
    await waitFor(() => expect(merchant.result.current.data?.map((a) => a.code)).toEqual(['USDC', 'XLM']));
  });

  it('disabling removes the asset from the merchant list, and a failure rolls everything back', async () => {
    api.get.mockResolvedValue({ data: { data: [USDC, XLM] } });
    api.patch.mockRejectedValue(new Error('boom'));
    const { wrapper } = setup();
    const merchant = renderHook(() => useEnabledAssets(), { wrapper });
    const admin = renderHook(() => useAdminAssets(), { wrapper });
    const update = renderHook(() => useUpdateAsset(), { wrapper });
    await waitFor(() => expect(merchant.result.current.data).toHaveLength(2));
    await waitFor(() => expect(admin.result.current.data).toHaveLength(2));

    await act(async () => {
      update.result.current.mutate({ code: 'XLM', patch: { enabled: false } });
    });

    await waitFor(() => expect(update.result.current.isError).toBe(true));
    // Rolled back in both caches: XLM is enabled again everywhere.
    expect(merchant.result.current.data?.map((a) => a.code)).toEqual(['USDC', 'XLM']);
    expect(admin.result.current.data?.find((a) => a.code === 'XLM')?.enabled).toBe(true);
    expect(api.patch).toHaveBeenCalledWith('/api/admin/assets/XLM', { isActive: false });
  });

  it('a successful disable drops the asset from the merchant list', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [USDC, XLM] } }).mockResolvedValue({ data: { data: [USDC] } });
    api.patch.mockResolvedValue({ data: { data: { ...XLM, isActive: false } } });
    const { wrapper } = setup();
    const merchant = renderHook(() => useEnabledAssets(), { wrapper });
    const update = renderHook(() => useUpdateAsset(), { wrapper });
    await waitFor(() => expect(merchant.result.current.data).toHaveLength(2));
    await act(async () => update.result.current.mutate({ code: 'XLM', patch: { enabled: false } }));
    await waitFor(() => expect(merchant.result.current.data?.map((a) => a.code)).toEqual(['USDC']));
    expect(merchant.result.current.codes.has('XLM')).toBe(false);
  });
});
