import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/lib/mock/transactions';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { formatDate } from '@/lib/utils/format';
import { Copy, ExternalLink, Download } from 'lucide-react';
import { toast } from 'sonner';

interface TransactionDetailProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetail({ transaction, isOpen, onClose }: TransactionDetailProps) {
  if (!transaction) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${transaction.txHash}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Full information about this payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase">Status</span>
            <div><StatusBadge status={transaction.status} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground uppercase">Amount (USDC)</span>
              <span className="font-semibold text-lg">
                <CurrencyDisplay amount={transaction.amountUsdc} currency="USDC" />
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground uppercase">Amount (NGN)</span>
              <span className="font-medium text-muted-foreground">
                <CurrencyDisplay amount={transaction.amountNgn} currency="NGN" showDecimals={false} />
              </span>
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase">Date & Time</span>
            <span className="text-sm">{formatDate(transaction.timestamp)}</span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase">Source</span>
            <span className="text-sm">{transaction.source}</span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase">Payer Address</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono truncate bg-muted/50 px-2 py-1 rounded">
                {transaction.payerAddress}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleCopy(transaction.payerAddress, 'Payer address')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-xs text-muted-foreground uppercase">Transaction Hash</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono truncate bg-muted/50 px-2 py-1 rounded w-full">
                {transaction.txHash}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleCopy(transaction.txHash, 'Transaction hash')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {transaction.stellarOpId && (
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground uppercase">Stellar Operation ID</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono truncate bg-muted/50 px-2 py-1 rounded">
                  {transaction.stellarOpId}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopy(transaction.stellarOpId!, 'Operation ID')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Explorer
            </a>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => toast.success('Receipt download started')}>
            <Download className="mr-2 h-4 w-4" />
            Receipt
          </Button>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
