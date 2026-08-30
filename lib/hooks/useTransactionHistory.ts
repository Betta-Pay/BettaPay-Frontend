'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletStore } from '@/lib/store/walletStore';
import { formatRelativeTime, formatDate } from '@/lib/utils/format';

const NETWORK_URLS: Record<string, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
};

export interface StellarPayment {
  id: string;
  type: 'receive' | 'send';
  label: string;
  amount: number;
  assetCode: string;
  timestamp: string;
  formattedDate?: string;
  txHash: string;
  counterparty: string;
  /** Horizon paging token — used as the cursor for the next page. */
  pagingToken: string;
}

export type TransactionHistoryOrder = 'asc' | 'desc';

export interface UseTransactionHistoryOptions {
  /** Page size sent to Horizon (`limit`). Defaults to 20. */
  pageSize?: number;
  /** Sort order for Horizon payments. Defaults to `desc` (newest first). */
  order?: TransactionHistoryOrder;
  /** Explicit Stellar account; falls back to the connected wallet address. */
  address?: string | null;
}

interface HorizonPaymentRecord {
  id: string;
  paging_token: string;
  from: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  created_at: string;
  transaction_hash: string;
}

interface HorizonPaymentsPage {
  _embedded?: { records?: HorizonPaymentRecord[] };
  _links?: {
    next?: { href?: string };
    self?: { href?: string };
  };
}

function getNetwork(): 'testnet' | 'public' {
  const val = STELLAR_NETWORK.toLowerCase();
  if (val === 'mainnet' || val === 'public') return 'public';
  return 'testnet';
}

function resolveOptions(
  limitOrOptions: number | UseTransactionHistoryOptions = 20,
  explicitAddress?: string | null,
): Required<Pick<UseTransactionHistoryOptions, 'pageSize' | 'order'>> & {
  address?: string | null;
} {
  if (typeof limitOrOptions === 'number') {
    return {
      pageSize: limitOrOptions,
      order: 'desc',
      address: explicitAddress,
    };
  }
  return {
    pageSize: limitOrOptions.pageSize ?? 20,
    order: limitOrOptions.order ?? 'desc',
    address: limitOrOptions.address ?? explicitAddress,
  };
}

function mapRecord(record: HorizonPaymentRecord, address: string): StellarPayment {
  const isReceive = record.to === address;
  const assetCode =
    record.asset_type === 'native' ? 'XLM' : record.asset_code || 'USDC';
  const counterparty = isReceive ? record.from : record.to;
  const shortAddress = counterparty
    ? `${counterparty.slice(0, 4)}...${counterparty.slice(-4)}`
    : '—';

  return {
    id: record.id,
    type: isReceive ? 'receive' : 'send',
    label: `Payment ${isReceive ? 'from' : 'to'} ${shortAddress}`,
    amount: parseFloat(record.amount),
    assetCode,
    timestamp: formatRelativeTime(record.created_at) || 'Just now',
    formattedDate: formatDate(record.created_at),
    txHash: record.transaction_hash,
    counterparty,
    pagingToken: record.paging_token,
  };
}

/**
 * Fetch paginated on-chain payment history from Horizon.
 *
 * Supports cursor-based `loadMore` so earlier pages are never re-fetched when
 * scrolling through a merchant's full history.
 */
export function useTransactionHistory(
  limitOrOptions: number | UseTransactionHistoryOptions = 20,
  explicitAddress?: string | null,
) {
  const opts = resolveOptions(limitOrOptions, explicitAddress);
  const [transactions, setTransactions] = useState<StellarPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const storeAddress = useWalletStore((s) => s.address);
  const network = useWalletStore((s) => s.network);
  const address = opts.address || storeAddress;

  const pageSize = opts.pageSize;
  const order = opts.order;

  // Keep latest pagination cursor available to loadMore without stale closures.
  const nextCursorRef = useRef<string | null>(null);
  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const parsePage = useCallback(
    (data: HorizonPaymentsPage, account: string) => {
      const records = data._embedded?.records || [];
      const payments = records.map((record) => mapRecord(record, account));
      const lastToken = payments.length > 0 ? payments[payments.length - 1].pagingToken : null;
      // Prefer Horizon's next link when present; otherwise advance via last paging token.
      const hasNext = Boolean(data._links?.next?.href) && payments.length >= pageSize;
      return { payments, nextCursor: hasNext ? lastToken : null, hasNext };
    },
    [pageSize],
  );

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      if (!address) {
        return { payments: [] as StellarPayment[], nextCursor: null, hasNext: false };
      }

      const horizonUrl = NETWORK_URLS[network] || NETWORK_URLS[getNetwork()];
      const params = new URLSearchParams({
        limit: String(pageSize),
        order,
      });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(
        `${horizonUrl}/accounts/${address}/payments?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Horizon error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as HorizonPaymentsPage;
      return parsePage(data, address);
    },
    [address, network, pageSize, order, parsePage],
  );

  const fetchTransactions = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      setNextCursor(null);
      setHasNextPage(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const page = await fetchPage(null);
      setTransactions(page.payments);
      setNextCursor(page.nextCursor);
      setHasNextPage(page.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      setTransactions([]);
      setNextCursor(null);
      setHasNextPage(false);
    } finally {
      setLoading(false);
    }
  }, [address, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!address || !hasNextPage || isFetchingNextPage || loading) return;
    const cursor = nextCursorRef.current;
    if (!cursor) return;

    setIsFetchingNextPage(true);
    setError(null);

    try {
      const page = await fetchPage(cursor);
      setTransactions((prev) => {
        const seen = new Set(prev.map((tx) => tx.id));
        const appended = page.payments.filter((tx) => !seen.has(tx.id));
        return [...prev, ...appended];
      });
      setNextCursor(page.nextCursor);
      setHasNextPage(page.hasNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more transactions');
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [address, hasNextPage, isFetchingNextPage, loading, fetchPage]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
    pageSize,
    order,
    nextCursor,
  };
}
