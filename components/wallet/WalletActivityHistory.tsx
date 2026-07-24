"use client";

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/shared';
import { ArrowUpRight, ArrowDownLeft, Inbox, RefreshCcw, ExternalLink } from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';

interface WalletTx {
  id: string;
  type: 'receive' | 'send';
  label: string;
  amount: number;
  time: string;
  txHash?: string;
}

const mockTxHistory: WalletTx[] = [
  { id: 'w1', type: 'receive', label: 'Payment from link_02', amount: 45.5, time: '2h ago', txHash: '0x1234567890abcdef1234567890abcdef12345678' },
  { id: 'w2', type: 'receive', label: 'Payment from link_01', amount: 750, time: '5h ago', txHash: '0xabcdef1234567890abcdef1234567890abcdef12' },
  { id: 'w3', type: 'send', label: 'Settlement to GTBank', amount: 1200, time: 'Yesterday' },
  { id: 'w4', type: 'receive', label: 'Payment from link_03', amount: 29, time: 'Yesterday', txHash: '0x9999999999abcdef1234567890abcdef12345678' },
];

const WalletActivityItem = memo(function WalletActivityItem({ tx }: { tx: WalletTx }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'receive' ? 'bg-emerald-100' : 'bg-primary/20'}`}>
        {tx.type === 'receive' ? (
          <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
        ) : (
          <ArrowUpRight className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{tx.label}</p>
        <p className="text-xs text-muted-foreground">{tx.time}</p>
      </div>
      <span className={`text-sm font-semibold ${tx.type === 'receive' ? 'text-emerald-600' : 'text-foreground'}`}>
        {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(2)} USDC
      </span>
      {tx.txHash && (
        <a
          href={getStellarExplorerTxUrl(tx.txHash)}
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
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">Wallet Activity</CardTitle>
          <CardDescription>Recent on-chain transactions</CardDescription>
        </div>
        <Button variant="ghost" aria-label="Refresh balances" className="text-xs text-muted-foreground min-h-[44px] px-3 rounded-lg">
          <RefreshCcw className="w-3 h-3 mr-1.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {mockTxHistory.length === 0 ? (
          <EmptyState icon={Inbox} title="No wallet activity yet" description="On-chain transactions will appear here once your wallet receives payments." />
        ) : (
          <div className="space-y-2">
            {mockTxHistory.map((tx) => (
              <WalletActivityItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
