"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Card, CardContent, Input, Button, Skeleton, NetworkTooltip, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { StatusBadge, CopyAddress, CurrencyDisplay, ErrorDisplay, EmptyState, ExportMenu } from '@/components/shared';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { usePayments, type ApiPayment } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils/format';
import { sanitizeSearchQuery } from '@/lib/utils/sanitize';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SearchX, ExternalLink } from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useWalletStore } from '@/lib/store/walletStore';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { cn } from '@/lib/utils';

type Transaction = ApiPayment;

function isTransaction(value: unknown): value is Transaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'amountUsdc' in value &&
    'status' in value &&
    'createdAt' in value &&
    typeof (value as Transaction).id === 'string' &&
    typeof (value as Transaction).amountUsdc === 'number' &&
    typeof (value as Transaction).status === 'string' &&
    typeof (value as Transaction).createdAt === 'string'
  );
}

interface TransactionCardProps {
  tx: Transaction;
  selected: boolean;
  onClick: (tx: Transaction) => void;
}

const TransactionCard = memo(function TransactionCard({ tx, selected, onClick }: TransactionCardProps) {
  const network = useWalletStore((s) => s.network);
  return (
    <div
      data-row-id={tx.id}
      className={cn(
        'border border-border/50 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors',
        selected && 'ring-2 ring-primary/40 bg-muted/20',
      )}
      onClick={() => onClick(tx)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</span>
        <StatusBadge status={tx.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Payer</span>
          <CopyAddress address={tx.payerAddress ?? ''} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tx Hash</span>
          <div className="flex items-center gap-2">
            <CopyAddress address={tx.txHash ?? ''} />
            {tx.txHash && (
              <a
                href={getStellarExplorerTxUrl(tx.txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on Stellar Explorer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Source</span>
          <span className="text-sm text-muted-foreground">{tx.source ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount (USDC)</span>
          <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount (NGN)</span>
          <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
        </div>
      </div>
    </div>
  );
});

interface TransactionRowProps {
  tx: Transaction;
  translateY: number;
  selected: boolean;
  onClick: (tx: Transaction) => void;
}

const TransactionRow = memo(function TransactionRow({
  tx,
  translateY,
  selected,
  onClick,
}: TransactionRowProps) {
  const network = useWalletStore((s) => s.network);
  return (
    <tr
      data-row-id={tx.id}
      tabIndex={0}
      aria-selected={selected}
      className={cn(
        'border-border/50 hover:bg-muted/30 cursor-pointer border-b absolute left-0 w-full table table-fixed',
        selected && 'bg-muted/40',
      )}
      onClick={() => onClick(tx)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(tx);
        }
      }}
      style={{ transform: `translateY(${translateY}px)`, height: 48 }}
    >
      <td className="text-muted-foreground whitespace-nowrap px-4 py-2 text-sm w-[180px]">
        {formatDate(tx.createdAt)}
      </td>
      <td className="px-4 py-2 text-sm">
        <CopyAddress address={tx.payerAddress ?? ''} />
      </td>
      <td className="px-4 py-2 text-sm">
        <CopyAddress address={tx.txHash ?? ''} />
      </td>
      <td className="text-muted-foreground px-4 py-2 text-sm">
        {tx.source ?? '—'}
      </td>
      <td className="text-right font-medium px-4 py-2 text-sm">
        <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
      </td>
      <td className="text-right text-muted-foreground px-4 py-2 text-sm">
        <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
      </td>
      <td className="text-center px-4 py-2 text-sm">
        <StatusBadge status={tx.status} />
      </td>
      <td className="w-[80px] text-center px-4 py-2 text-sm">
        {tx.txHash && (
          <a
            href={getStellarExplorerTxUrl(tx.txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Stellar Explorer"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </a>
        )}
      </td>
    </tr>
  );
});

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />;
  if (direction === 'desc') return <ArrowDown className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 opacity-40" aria-hidden="true" />;
}

export default function TransactionsPage() {
  const { data: payments = [], isLoading, error: fetchError, refetch, isFetching } = usePayments();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '');
  const sanitizedOnChange = useCallback(
    (value: string) => setSearchTerm(sanitizeSearchQuery(value)),
    [],
  );
  const [debouncedSearch] = useDebounceValue(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') ?? 'all');
  const [assetFilter, setAssetFilter] = useState(() => searchParams.get('asset') ?? 'all');
  const [dateRangeFilter, setDateRangeFilter] = useState(() => searchParams.get('date') ?? 'all');
  const [page, setPage] = useState<number>(() => {
    const p = searchParams.get('page');
    const n = p ? parseInt(p, 10) : NaN;
    return Number.isFinite(n) ? n : 1;
  });

  // Keep local state in sync when URL search params change externally
  useEffect(() => {
    setSearchTerm(searchParams.get('q') ?? '');
    setStatusFilter(searchParams.get('status') ?? 'all');
    setAssetFilter(searchParams.get('asset') ?? 'all');
    setDateRangeFilter(searchParams.get('date') ?? 'all');
    const p = searchParams.get('page');
    const n = p ? parseInt(p, 10) : NaN;
    setPage(Number.isFinite(n) ? n : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const pushParams = useCallback((updates: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams(searchParams as unknown as string);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === undefined || v === 'all' || (typeof v === 'string' && v === '')) {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    // use push so user can navigate back, replace could be used to avoid history pollution
    router.push(href);
  }, [router, pathname, searchParams]);

  // Selection is stored by stable id so background refetches cannot drop it.
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [txError, setTxError] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const focusedRowIdRef = useRef<string | null>(null);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return payments.filter((tx) => {
      const matchesSearch =
        (tx.txHash ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.payerAddress ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (tx.source ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        tx.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesAsset =
        assetFilter === 'all' ||
        (assetFilter === 'USDC' && tx.amountUsdc > 0) ||
        (assetFilter === 'NGN' && (tx.amountNgn ?? 0) > 0);

      let matchesDate = true;
      if (dateRangeFilter !== 'all') {
        const txDate = new Date(tx.createdAt);
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (dateRangeFilter === '7d') matchesDate = diffDays <= 7;
        if (dateRangeFilter === '30d') matchesDate = diffDays <= 30;
      }

      return matchesSearch && matchesStatus && matchesAsset && matchesDate;
    });
  }, [payments, debouncedSearch, statusFilter, assetFilter, dateRangeFilter]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Date',
        sortingFn: 'datetime',
      },
      {
        id: 'payerAddress',
        accessorFn: (row) => row.payerAddress ?? '',
        header: 'Payer',
      },
      {
        id: 'txHash',
        accessorFn: (row) => row.txHash ?? '',
        header: 'Tx Hash',
      },
      {
        id: 'source',
        accessorFn: (row) => row.source ?? '',
        header: 'Source',
      },
      {
        id: 'amountUsdc',
        accessorKey: 'amountUsdc',
        header: 'Amount (USDC)',
      },
      {
        id: 'amountNgn',
        accessorFn: (row) => row.amountNgn ?? 0,
        header: 'Amount (NGN)',
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
      },
      {
        id: 'explorer',
        enableSorting: false,
        header: 'Explorer',
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Stable ids keep row identity across background refetches.
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
  });

  const sortedRows = table.getRowModel().rows;

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (assetFilter !== 'all' ? 1 : 0) + (dateRangeFilter !== 'all' ? 1 : 0);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setAssetFilter('all');
    setDateRangeFilter('all');
  };

  const handleSelectTx = useCallback((tx: Transaction) => {
    setSelectedTxId(tx.id);
  }, []);

  // Sync debounced search -> URL (reset to page 1 on new search)
  useEffect(() => {
    pushParams({ q: debouncedSearch || null, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync filter values and page -> URL
  useEffect(() => {
    pushParams({
      status: statusFilter !== 'all' ? statusFilter : null,
      asset: assetFilter !== 'all' ? assetFilter : null,
      date: dateRangeFilter !== 'all' ? dateRangeFilter : null,
      page: page && page > 1 ? page : null,
    });
  }, [statusFilter, assetFilter, dateRangeFilter, page, pushParams]);

  // Resolve selection from the latest payments array so drawer content stays fresh
  // after refetch without losing which row was open.
  const selectedTx = useMemo(() => {
    if (!selectedTxId) return null;
    return payments.find((tx) => tx.id === selectedTxId) ?? null;
  }, [payments, selectedTxId]);

  // Export the FULL filtered+sorted dataset — never the virtualized visible slice.
  const exportRows = useMemo(
    () =>
      sortedRows.map((row) => {
        const tx = row.original;
        return [
          tx.createdAt,
          tx.payerAddress,
          tx.txHash,
          tx.source,
          tx.amountUsdc,
          tx.amountNgn ?? 0,
          tx.status,
        ];
      }),
    [sortedRows],
  );

  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
    getItemKey: (index) => sortedRows[index]?.id ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Preserve keyboard focus on the same logical row after a background refetch.
  useEffect(() => {
    if (!isFetching && focusedRowIdRef.current) {
      const el = tableContainerRef.current?.querySelector(
        `[data-row-id="${focusedRowIdRef.current.replace(/"/g, '\\"')}"]`,
      ) as HTMLElement | null;
      el?.focus({ preventScroll: true });
    }
  }, [isFetching, sortedRows]);

  useEffect(() => {
    const root = tableContainerRef.current;
    if (!root) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      const row = target?.closest?.('[data-row-id]') as HTMLElement | null;
      focusedRowIdRef.current = row?.dataset.rowId ?? null;
    };
    root.addEventListener('focusin', onFocusIn);
    return () => root.removeEventListener('focusin', onFocusIn);
  }, []);

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-24 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-4">
              <TableSkeleton rows={6} columns={7} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-muted-foreground mt-1">
                View all your incoming payments and settlements.
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by hash, address, or label..."
                  className="w-full pl-9 bg-background/50 border-border/50 focus-visible:ring-ring"
                  value={searchTerm}
                  onChange={(e) => sanitizedOnChange(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                  <SelectTrigger className="w-[120px] bg-card border-border/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assetFilter} onValueChange={(val) => val && setAssetFilter(val)}>
                  <SelectTrigger className="w-[120px] bg-card border-border/50">
                    <SelectValue placeholder="Asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assets</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateRangeFilter} onValueChange={(val) => val && setDateRangeFilter(val)}>
                  <SelectTrigger className="w-[130px] bg-card border-border/50">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleClearFilters}
                  >
                    Clear all filters
                  </Button>
                )}

                <NetworkTooltip show={!isOnline}>
                  <ExportMenu
                    id="export-csv-btn"
                    filename="transactions"
                    headers={['Date', 'Payer', 'TxHash', 'Source', 'AmountUSDC', 'AmountNGN', 'Status']}
                    rows={exportRows}
                    disabled={!isOnline}
                    className="border-border/50 bg-card"
                  />
                </NetworkTooltip>

                <Button
                  variant="outline"
                  className="border-border/50 bg-card"
                  onClick={() => setTxError(!txError)}
                >
                  {txError ? "Reset API" : "Simulate Error"}
                </Button>
              </div>
            </div>
          </div>

          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-4">
              {txError || fetchError ? (
                <div className="py-12">
                  <ErrorDisplay
                    message={fetchError ?? 'Failed to load transactions'}
                    onRetry={() => { setTxError(false); refetch(); }}
                  />
                </div>
              ) : (
                <>
                  {sortedRows.length === 0 ? (
                    <EmptyState
                      icon={SearchX}
                      title={searchTerm || activeFilterCount > 0 ? 'No transactions match filters' : 'No transactions yet'}
                      description={
                        searchTerm || activeFilterCount > 0
                          ? 'Try adjusting your search terms or clearing active filters.'
                          : 'Transactions will appear here once you receive payments through your payment links.'
                      }
                      action={
                        searchTerm || activeFilterCount > 0
                          ? {
                              label: 'Clear filters',
                              onClick: () => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setAssetFilter('all');
                                setDateRangeFilter('all');
                              }
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <div className="rounded-md border border-border/50 overflow-hidden hidden md:block">
                      <table className="w-full border-collapse table-fixed">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-border/50">
                              {headerGroup.headers.map((header) => {
                                const canSort = header.column.getCanSort();
                                const sorted = header.column.getIsSorted();
                                const alignRight = header.id === 'amountUsdc' || header.id === 'amountNgn';
                                const alignCenter = header.id === 'status' || header.id === 'explorer';
                                return (
                                  <th
                                    key={header.id}
                                    aria-sort={
                                      sorted === 'asc'
                                        ? 'ascending'
                                        : sorted === 'desc'
                                          ? 'descending'
                                          : 'none'
                                    }
                                    data-sorted={sorted || 'none'}
                                    className={cn(
                                      'px-4 py-2 text-sm font-medium',
                                      header.id === 'createdAt' && 'w-[180px]',
                                      header.id === 'explorer' && 'w-[80px]',
                                      alignRight && 'text-right',
                                      alignCenter && 'text-center',
                                      !alignRight && !alignCenter && 'text-left',
                                    )}
                                  >
                                    {canSort ? (
                                      <button
                                        type="button"
                                        className="inline-flex items-center min-h-[44px]"
                                        onClick={header.column.getToggleSortingHandler()}
                                        aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                                        data-testid={`sort-${header.id}`}
                                      >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        <SortIcon direction={sorted} />
                                      </button>
                                    ) : (
                                      flexRender(header.column.columnDef.header, header.getContext())
                                    )}
                                  </th>
                                );
                              })}
                            </tr>
                          ))}
                        </thead>
                      </table>
                      <div
                        ref={tableContainerRef}
                        className="h-[600px] overflow-y-auto border-t border-border/50"
                        data-testid="transactions-virtual-list"
                      >
                        <div style={{ height: `${totalSize}px`, position: 'relative' }}>
                          <table className="w-full border-collapse table-fixed">
                            <tbody>
                              {virtualItems.map((virtualItem) => {
                                const row = sortedRows[virtualItem.index];
                                const tx = row.original;
                                return (
                                  <TransactionRow
                                    key={row.id}
                                    tx={tx}
                                    translateY={virtualItem.start}
                                    selected={selectedTxId === tx.id}
                                    onClick={handleSelectTx}
                                  />
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:hidden space-y-3">
                    {sortedRows.map((row) => (
                      <TransactionCard
                        key={row.id}
                        tx={row.original}
                        selected={selectedTxId === row.id}
                        onClick={handleSelectTx}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <TransactionDrawer
        transaction={selectedTx && isTransaction(selectedTx) ? selectedTx : null}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
}
