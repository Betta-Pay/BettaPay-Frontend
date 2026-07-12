"use client";

import { useState, memo, useMemo, useRef } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { usePayments, type ApiPayment } from '@/lib/api/hooks';
import { formatDate } from '@/lib/utils/format';
import { sanitizeSearchQuery } from '@/lib/utils/sanitize';
import { Search, Download, Filter, SearchX, ExternalLink } from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { useOfflineStore } from '@/lib/store/offlineStore';

type Transaction = ApiPayment;



interface TransactionCardProps {
  tx: Transaction;
  onClick: (tx: Transaction) => void;
}

const TransactionCard = memo(function TransactionCard({ tx, onClick }: TransactionCardProps) {
  return (
    <div
      className="border border-border/50 rounded-lg p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => onClick(tx)}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{formatDate(tx.createdAt)}</span>
        <StatusBadge status={tx.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Payer</span>
          <CopyAddress address={tx.payerAddress} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tx Hash</span>
          <div className="flex items-center gap-2">
            <CopyAddress address={tx.txHash} />
            {tx.txHash && (
              <a
                href={getStellarExplorerTxUrl(tx.txHash)}
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
          <span className="text-sm text-muted-foreground">{tx.source}</span>
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

export default function TransactionsPage() {
  const { data: payments, isLoading, error: fetchError, refetch } = usePayments();
  const [searchTerm, setSearchTerm] = useState('');
  const sanitizedOnChange = (value: string) => setSearchTerm(sanitizeSearchQuery(value));
  const [debouncedSearch] = useDebounceValue(searchTerm, 300);
  const [filterCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txError, setTxError] = useState(false);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = useMemo(() =>
    payments.filter(tx =>
      (tx.txHash ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (tx.payerAddress ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
    [payments, debouncedSearch]
  );

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

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

      {/* Search + filter bar — sticky on mobile, static on sm+ */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-3 sm:static sm:bg-transparent sm:backdrop-blur-none sm:mx-0 sm:p-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by hash or address..."
              className="w-full pl-9 bg-background/50 border-border/50 focus-visible:ring-ring"
              value={searchTerm}
               onChange={(e) => sanitizedOnChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="relative flex-1 sm:flex-none border-border/50 bg-card">
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </Button>
            <NetworkTooltip show={!isOnline}>
              <Button
                variant="outline"
                disabled={!isOnline}
                aria-disabled={!isOnline}
                className="flex-1 sm:flex-none border-border/50 bg-card"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </NetworkTooltip>
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none border-border/50 bg-card"
              onClick={() => setTxError(!txError)}
            >
              {txError ? "Reset API" : "Simulate Error"}
            </Button>
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">
        {searchTerm
          ? `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} found for "${searchTerm}"`
          : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`}
      </p>

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
              {filteredTransactions.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={searchTerm ? 'No transactions match your search' : 'No transactions found'}
                  description={
                    searchTerm
                      ? 'Try adjusting your search terms or clearing filters.'
                      : 'Transactions will appear here once payments are received.'
                  }
                  action={
                    searchTerm
                      ? { label: 'Clear search', onClick: () => setSearchTerm('') }
                      : undefined
                  }
                />
              ) : (
                <div className="rounded-md border border-border/50 overflow-hidden hidden md:block">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr className="border-border/50">
                        <th className="w-[180px] px-4 py-2 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Payer</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Tx Hash</th>
                        <th className="px-4 py-2 text-left text-sm font-medium">Source</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Amount (USDC)</th>
                        <th className="px-4 py-2 text-right text-sm font-medium">Amount (NGN)</th>
                        <th className="px-4 py-2 text-center text-sm font-medium">Status</th>
                        <th className="w-[80px] px-4 py-2 text-center text-sm font-medium">Explorer</th>
                      </tr>
                    </thead>
                  </table>
                  <div
                    ref={tableContainerRef}
                    className="h-[600px] overflow-y-auto border-t border-border/50"
                  >
                    <div style={{ height: `${totalSize}px`, position: 'relative' }}>
                      <table className="w-full border-collapse">
                        <tbody>
                          {virtualItems.map((virtualItem) => {
                            const tx = filteredTransactions[virtualItem.index];
                            return (
                              <tr
                                key={virtualItem.key}
                                className="border-border/50 hover:bg-muted/30 cursor-pointer border-b"
                                onClick={() => setSelectedTx(tx)}
                                style={{
                                  transform: `translateY(${virtualItem.start}px)`,
                                }}
                              >
                                <td className="text-muted-foreground whitespace-nowrap px-4 py-2 text-sm">
                                  {formatDate(tx.createdAt)}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <CopyAddress address={tx.payerAddress} />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <CopyAddress address={tx.txHash} />
                                </td>
                                <td className="text-muted-foreground px-4 py-2 text-sm">
                                  {tx.source}
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
                                      href={getStellarExplorerTxUrl(tx.txHash)}
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="md:hidden space-y-3">
                {filteredTransactions.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title={searchTerm ? 'No transactions match your search' : 'No transactions found'}
                    description={
                      searchTerm
                        ? 'Try adjusting your search terms or clearing filters.'
                        : 'Transactions will appear here once payments are received.'
                    }
                    action={
                      searchTerm
                        ? { label: 'Clear search', onClick: () => setSearchTerm('') }
                        : undefined
                    }
                  />
                ) : (
                  filteredTransactions.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      tx={tx}
                      onClick={setSelectedTx}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      </>

      )}
      <TransactionDetail 
        transaction={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
