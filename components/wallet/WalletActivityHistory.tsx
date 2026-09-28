"use client";

import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/shared';
import { ArrowUpRight, ArrowDownLeft, Inbox, RefreshCcw, ExternalLink, Loader2, Wallet } from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useTransactionHistory, type StellarPayment } from '@/lib/hooks/useTransactionHistory';
import { useWalletStore } from '@/lib/store/walletStore';
import { useAuthStore } from '@/lib/store/authStore';

export type WalletTx = StellarPayment;

const WalletActivityItem = memo(function WalletActivityItem({ tx }: { tx: WalletTx }) {
  const network = useWalletStore((s) => s.network);
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'receive' ? 'bg-emerald-100 dark:bg-emerald-950/40' : 'bg-primary/20'}`}>
        {tx.type === 'receive' ? (
          <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowUpRight className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{tx.label}</p>
        <p className="text-xs text-muted-foreground" title={tx.formattedDate}>
          {tx.timestamp}
        </p>
      </div>
      <span className={`text-sm font-semibold ${tx.type === 'receive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(2)} {tx.assetCode}
      </span>
      {tx.txHash && (
        <a
          href={getStellarExplorerTxUrl(tx.txHash, network)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View transaction on Stellar Explorer"
        >
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] rounded-lg">
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </a>
      )}
    </div>
  );
});

export function WalletActivityHistory() {
  // Single source of truth: the wallet store. The address is no longer drilled
  // in from the page (issue #761). Mock/preview sessions are keyed by the
  // merchant's own Stellar public key, so it stays as the fallback used when no
  // wallet is connected.
  const storeAddress = useWalletStore((s) => s.address);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const activeAddress = storeAddress || userId || null;
  const {
    transactions,
    loading,
    error,
    refetch,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactionHistory(20, activeAddress);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">Wallet Activity</CardTitle>
          <CardDescription>Recent on-chain Stellar transactions</CardDescription>
        </div>
        <Button
          variant="ghost"
          aria-label="Refresh transactions"
          onClick={refetch}
          disabled={loading || !activeAddress}
          className="text-xs text-muted-foreground min-h-[44px] px-3 rounded-lg"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <RefreshCcw className="w-3 h-3 mr-1.5" />
          )}{' '}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!activeAddress ? (
          <EmptyState
            icon={Wallet}
            title="Wallet not connected"
            description="Connect your Stellar wallet or provide an account address to view live on-chain activity."
          />
        ) : loading && transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Fetching on-chain transactions from Horizon...</p>
          </div>
        ) : error && transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Failed to load transactions"
            description={error}
            action={{ label: "Retry", onClick: refetch }}
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No wallet activity yet"
            description="On-chain transactions will appear here once your wallet receives or sends payments."
          />
        ) : (
          <div className="space-y-3">
            <div
              ref={parentRef}
              className="h-[300px] overflow-auto"
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={transactions[virtualRow.index]?.id ?? virtualRow.key}
                    ref={virtualizer.measureElement}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <WalletActivityItem tx={transactions[virtualRow.index]} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 pt-1">
              {error && (
                <p className="text-xs text-destructive text-center" role="alert">
                  {error}
                </p>
              )}
              {hasNextPage ? (
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-lg"
                  onClick={() => { void loadMore(); }}
                  disabled={isFetchingNextPage}
                  aria-label="Load more wallet transactions"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Loading more…
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              ) : (
                <p
                  className="text-xs text-muted-foreground"
                  data-testid="wallet-activity-end"
                  role="status"
                >
                  End of transaction history
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
