"use client";

import { useState, memo, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CopyAddress } from '@/components/shared/CopyAddress';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { EmptyState } from '@/components/shared/EmptyState';
import { mockTransactions } from '@/lib/mock/transactions';
import { formatDate } from '@/lib/utils/format';
import { Search, Download, Filter, SearchX } from 'lucide-react';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { Transaction } from '@/lib/mock/transactions';
import { useOfflineStore } from '@/lib/store/offlineStore';

interface TransactionRowProps {
  tx: Transaction;
  onClick: (tx: Transaction) => void;
}

const TransactionRow = memo(function TransactionRow({ tx, onClick }: TransactionRowProps) {
  return (
    <TableRow
      className="border-border/50 hover:bg-muted/30 cursor-pointer"
      onClick={() => onClick(tx)}
    >
      <TableCell className="text-muted-foreground whitespace-nowrap">
        {formatDate(tx.timestamp)}
      </TableCell>
      <TableCell>
        <CopyAddress address={tx.payerAddress} />
      </TableCell>
      <TableCell>
        <CopyAddress address={tx.txHash} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {tx.source}
      </TableCell>
      <TableCell className="text-right font-medium">
        <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={tx.status} />
      </TableCell>
    </TableRow>
  );
});

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
        <span className="text-sm text-muted-foreground">{formatDate(tx.timestamp)}</span>
        <StatusBadge status={tx.status} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Payer</span>
          <CopyAddress address={tx.payerAddress} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Tx Hash</span>
          <CopyAddress address={tx.txHash} />
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = useMemo(() =>
    mockTransactions.filter(tx =>
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.payerAddress.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm, mockTransactions]
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
              className="w-full pl-9 bg-background/50 border-border/50 focus-visible:ring-brand-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="relative flex-1 sm:flex-none border-border/50 bg-brand-surface">
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {filterCount}
                </span>
              )}
            </Button>
            <NetworkTooltip show={!isOnline}>
              <Button
                variant="outline"
                disabled={!isOnline}
                aria-disabled={!isOnline}
                className="flex-1 sm:flex-none border-border/50 bg-brand-surface"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </NetworkTooltip>
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">
        {searchTerm
          ? `${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} found for "${searchTerm}"`
          : `Showing ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}`}
      </p>

      <Card className="bg-brand-surface border-border/50 shadow-sm">
        <CardContent className="pt-4">
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
            <>
              <div className="rounded-md border border-border/50 overflow-hidden hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Tx Hash</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount (USDC)</TableHead>
                      <TableHead className="text-right">Amount (NGN)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <div
                  ref={tableContainerRef}
                  className="h-[600px] overflow-y-auto border-t border-border/50"
                  style={{
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: `${totalSize}px`,
                    }}
                  >
                    <table className="w-full border-collapse">
                      <tbody>
                        {virtualItems.map((virtualItem) => {
                          const tx = filteredTransactions[virtualItem.index];
                          return (
                            <tr
                              key={virtualItem.key}
                              className="border-border/50 hover:bg-muted/30 cursor-pointer"
                              onClick={() => setSelectedTx(tx)}
                              style={{
                                transform: `translateY(${virtualItem.start}px)`,
                              }}
                            >
                              <td className="text-muted-foreground whitespace-nowrap px-4 py-2 text-sm">
                                {formatDate(tx.timestamp)}
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
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
        </CardContent>
      </Card>

      <TransactionDetail 
        transaction={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
