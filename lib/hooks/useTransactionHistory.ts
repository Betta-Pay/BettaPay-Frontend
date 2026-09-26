'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/store/walletStore';
import { formatRelativeTime, formatDate } from '@/lib/utils/format';
import { STELLAR_NETWORK } from '@/lib/config';

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

interface TransactionHistoryPage {
  payments: StellarPayment[];
  nextCursor: string | null;
  hasNext: boolean;
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

  const storeAddress = useWalletStore((s) => s.address);
  const network = useWalletStore((s) => s.network);
  const address = opts.address || storeAddress;

  const pageSize = opts.pageSize;
  const order = opts.order;

  const query = useInfiniteQuery({
    queryKey: ['transactionHistory', network, address, pageSize, order],
    enabled: Boolean(address),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<TransactionHistoryPage> => {
      if (!address) {
        return { payments: [], nextCursor: null, hasNext: false };
      }

      const horizonUrl = NETWORK_URLS[network] || NETWORK_URLS[getNetwork()];
      const params = new URLSearchParams({
        limit: String(pageSize),
        order,
      });
      if (pageParam) params.set('cursor', pageParam);

      const response = await fetch(
        `${horizonUrl}/accounts/${address}/payments?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Horizon error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as HorizonPaymentsPage;
      const records = data._embedded?.records || [];
      const payments = records.map((record) => mapRecord(record, address));
      const lastToken = payments.length > 0 ? payments[payments.length - 1].pagingToken : null;
      const hasNext = Boolean(data._links?.next?.href) && payments.length >= pageSize;

      return { payments, nextCursor: hasNext ? lastToken : null, hasNext };
    },
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.nextCursor : undefined,
  });

  const pages = query.data?.pages ?? [];
  const transactions = pages.flatMap((page) => page.payments);
  const lastPage = pages[pages.length - 1];

  return {
    transactions,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: () => { void query.refetch(); },
    loadMore: () => query.fetchNextPage(),
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    pageSize,
    order,
    nextCursor: lastPage?.nextCursor ?? null,
  };
}
