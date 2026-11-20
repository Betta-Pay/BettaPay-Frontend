/**
 * Unit tests for cursor pagination in useTransactionHistory (#515).
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { mapRecord, useTransactionHistory } from '@/lib/hooks/useTransactionHistory';

const mockAddress = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const secondAddress = 'GBCDEFGHIJKLMNOPQRSTUVWXYZ234567A';
let mockNetwork = 'testnet';

function createWrapper(queryClient = new QueryClient()) {
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: Infinity },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: (s: { address: string; network: string }) => unknown) =>
    selector({ address: mockAddress, network: mockNetwork }),
}));

function makeRecord(id: string, pagingToken: string) {
  return {
    id,
    paging_token: pagingToken,
    from: 'GFROMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    to: mockAddress,
    amount: '10.0000000',
    asset_type: 'credit_alphanum4',
    asset_code: 'USDC',
    created_at: '2026-08-01T10:00:00Z',
    transaction_hash: `hash_${id}`,
  };
}

describe('useTransactionHistory pagination (#515)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  describe('mapRecord', () => {
    it('maps a payment record', () => {
      const record = makeRecord('payment', 'payment-token');
      expect(mapRecord(record, mockAddress)).toMatchObject({
        id: 'payment',
        type: 'receive',
        amount: 10,
        assetCode: 'USDC',
        pagingToken: 'payment-token',
      });
    });

    it('uses starting_balance for a create_account record', () => {
      const record = {
        id: 'create',
        paging_token: 'create-token',
        type: 'create_account',
        funder: 'GFUNDERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        account: mockAddress,
        starting_balance: '25.5000000',
        asset_type: 'native',
        created_at: '2026-08-01T10:00:00Z',
        transaction_hash: 'hash_create',
      };

      expect(mapRecord(record, mockAddress)).toMatchObject({
        id: 'create',
        type: 'receive',
        amount: 25.5,
        assetCode: 'XLM',
      });
    });

    it('maps path payment amounts without returning NaN', () => {
      const record = {
        id: 'path',
        paging_token: 'path-token',
        type: 'path_payment_strict_receive',
        from: 'GFROMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        to: mockAddress,
        amount: '7.2500000',
        asset_type: 'native',
        created_at: '2026-08-01T10:00:00Z',
        transaction_hash: 'hash_path',
      };

      expect(mapRecord(record, mockAddress)).toMatchObject({
        id: 'path',
        type: 'receive',
        amount: 7.25,
        assetCode: 'XLM',
      });
    });

    it('passes an AbortSignal to each Horizon request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _embedded: { records: [] }, _links: {} }),
      });
      const queryClient = new QueryClient();
      queryClient.setDefaultOptions({ queries: { retry: false } });

      const { result } = renderHook(
        () => useTransactionHistory({ address: mockAddress }),
        { wrapper: createWrapper(queryClient) },
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockNetwork = 'testnet';
    jest.clearAllMocks();
  });

  it('queries the futurenet Horizon endpoint', async () => {
    mockNetwork = 'futurenet';
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ _embedded: { records: [] }, _links: {} }),
    });

    const { result } = renderHook(
      () => useTransactionHistory({ address: mockAddress }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://horizon-futurenet.stellar.org/accounts/'),
    );
  });

  it('fetches the first page and exposes loadMore with a cursor', async () => {
    const page1 = {
      _embedded: {
        records: [makeRecord('1', 'token-1'), makeRecord('2', 'token-2')],
      },
      _links: { next: { href: 'https://horizon-testnet.stellar.org/accounts/x/payments?cursor=token-2' } },
    };
    const page2 = {
      _embedded: {
        records: [makeRecord('3', 'token-3')],
      },
      _links: {},
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
      });

    const { result } = renderHook(
      () => useTransactionHistory({ pageSize: 2, order: 'desc', address: mockAddress }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.transactions).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.nextCursor).toBe('token-2');

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false));
    expect(result.current.transactions).toHaveLength(3);
    expect(result.current.transactions.map((t) => t.id)).toEqual(['1', '2', '3']);
    expect(result.current.hasNextPage).toBe(false);

    // Second request must include the cursor from page 1 (no re-fetch of earlier pages).
    const secondUrl = (global.fetch as jest.Mock).mock.calls[1][0] as string;
    expect(secondUrl).toContain('cursor=token-2');
    expect(secondUrl).toContain('limit=2');
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
  });

  it('marks end-of-list when Horizon returns a short final page', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: { records: [makeRecord('1', 'token-1')] },
        _links: {},
      }),
    });

    const { result } = renderHook(
      () => useTransactionHistory({ pageSize: 20, address: mockAddress }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.nextCursor).toBeNull();
  });

  it('caches history separately by wallet address', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _embedded: { records: [makeRecord('1', 'token-1')] }, _links: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _embedded: { records: [makeRecord('2', 'token-2')] }, _links: {} }),
      });

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ address }) => useTransactionHistory({ address }),
      { initialProps: { address: mockAddress }, wrapper },
    );

    await waitFor(() => expect(result.current.transactions).toHaveLength(1));
    expect(result.current.transactions[0].id).toBe('1');

    rerender({ address: secondAddress });
    await waitFor(() => expect(result.current.transactions[0]?.id).toBe('2'));

    rerender({ address: mockAddress });
    expect(result.current.transactions[0]?.id).toBe('1');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
