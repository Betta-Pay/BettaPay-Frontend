"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  ExternalLink, 
  Download, 
  Share2, 
  Clock, 
  Hexagon, 
  User, 
  Link as LinkIcon 
} from 'lucide-react';
import { Transaction } from '@/lib/mock/transactions';
import { formatDate } from '@/lib/utils/format';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useNotify } from '@/lib/hooks/useNotify';

interface TransactionDetailProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetail: React.FC<TransactionDetailProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const { success, info, error } = useNotify();
  if (!transaction) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success(`${label} copied to clipboard`);
  };

  const openExplorer = () => {
    window.open(`https://stellar.expert/explorer/public/tx/${transaction.txHash}`, '_blank');
  };

  const detailRows = [
    { label: 'Status', value: <StatusBadge status={transaction.status} />, icon: Clock },
    { 
      label: 'Transaction Hash', 
      value: (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs truncate max-w-[200px]">{transaction.txHash}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(transaction.txHash, 'Transaction hash')}>
            <Copy className="size-3" />
          </Button>
        </div>
      ), 
      icon: Hexagon 
    },
    { 
      label: 'Stellar Operation ID', 
      value: transaction.stellarOpId || '1928374655', // fallback for mock
      icon: Hexagon 
    },
    { 
      label: 'Payer Address', 
      value: (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{transaction.payerAddress}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(transaction.payerAddress, 'Payer address')}>
            <Copy className="size-3" />
          </Button>
        </div>
      ), 
      icon: User 
    },
    { 
      label: 'Source', 
      value: transaction.source, 
      icon: LinkIcon 
    },
    { 
      label: 'Timestamp', 
      value: formatDate(transaction.timestamp), 
      icon: Clock 
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Amount Summary */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Total Amount</p>
            <div className="text-3xl font-bold text-slate-900">
              <CurrencyDisplay amount={transaction.amountUsdc} currency="USDC" />
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              ≈ ₦{transaction.amountNgn.toLocaleString()} NGN
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-4">
            {detailRows.map((row, i) => (
              <div key={i} className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-slate-400">
                  <row.icon className="size-3.5" />
                  <span className="text-xs font-medium">{row.label}</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 text-right">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => info('Receipt generation coming soon')}>
              <Download className="w-3.5 h-3.5 mr-2" /> Receipt
            </Button>
            <Button variant="outline" size="sm" onClick={() => info('Share functionality coming soon')}>
              <Share2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button className="bg-slate-900 text-white hover:bg-slate-800" size="sm" onClick={openExplorer}>
            View in Explorer <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
