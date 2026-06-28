"use client";

import { useState } from 'react';
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

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const isOnline = useOfflineStore((s) => s.isOnline);

  const filteredTransactions = mockTransactions.filter(tx =>
    tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.payerAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
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
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
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
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow 
                      key={tx.id} 
                      className="border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
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
                  ))
                )}
              </TableBody>
            </Table>
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
