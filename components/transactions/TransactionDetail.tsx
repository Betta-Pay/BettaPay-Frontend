"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui';
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
import { CurrencyDisplay } from '@/components/shared';
import { StatusBadge } from '@/components/shared';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useWalletStore } from '@/lib/store/walletStore';
import { useNotify } from '@/lib/hooks/useNotify';
import { usePayment } from '@/lib/api/hooks';

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
  const { success, info } = useNotify();
  const network = useWalletStore((s) => s.network);

  // History / focus management
  const triggerRef = useRef<HTMLElement | null>(null);
  const hasPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Push history, manage focus, and handle browser back / Esc explicitly.
  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? el).focus();
    });

    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ transactionDetailOpen: true }, '');
        hasPushedRef.current = true;
      } catch {}
    }

    const handlePopState = () => {
      if (hasPushedRef.current) {
        hasPushedRef.current = false;
        const t = triggerRef.current;
        requestAnimationFrame(() => t?.focus?.());
        onCloseRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (hasPushedRef.current) {
          hasPushedRef.current = false;
          try {
            if (typeof window !== 'undefined' && window.history.state?.transactionDetailOpen) {
              window.history.back();
            }
          } catch {}
        }
        const t = triggerRef.current;
        requestAnimationFrame(() => t?.focus?.());
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (hasPushedRef.current && typeof window !== 'undefined') {
      hasPushedRef.current = false;
      try {
        if (window.history.state?.transactionDetailOpen) {
          window.history.back();
        }
      } catch {}
    }
    const t = triggerRef.current;
    requestAnimationFrame(() => t?.focus?.());
    onCloseRef.current();
  }, []);

  // Restore focus when closed via other means (e.g., backdrop click that bypassed handleClose).
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      const t = triggerRef.current;
      const active = document.activeElement;
      const dialogEl = document.querySelector('[data-slot="dialog-content"]');
      const shouldRestore =
        active === document.body || (dialogEl?.contains(active) ?? false);
      if (shouldRestore) {
        requestAnimationFrame(() => t?.focus?.());
      }
      const id = setTimeout(() => {
        if (!hasPushedRef.current) triggerRef.current = null;
      }, 350);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  const { data: fetchedTransaction } = usePayment(transaction?.id ?? null);
  const displayTransaction = (fetchedTransaction ?? transaction) as Transaction | null;

  if (!displayTransaction) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    success(`${label} copied to clipboard`);
  };

  const openExplorer = () => {
    if (displayTransaction.txHash) {
      window.open(getStellarExplorerTxUrl(displayTransaction.txHash, network), '_blank');
    }
  };

  const detailRows = [
    { label: 'Status', value: <StatusBadge status={displayTransaction.status} />, icon: Clock },
    {
      label: 'Transaction Hash',
      value: (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs truncate max-w-[200px]">{displayTransaction.txHash}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(displayTransaction.txHash ?? '', 'Transaction hash')}>
            <Copy className="size-3" />
          </Button>
        </div>
      ),
      icon: Hexagon
    },
    {
      label: 'Stellar Operation ID',
      value: displayTransaction.stellarOpId || '1928374655', // fallback for mock
      icon: Hexagon
    },
    {
      label: 'Payer Address',
      value: (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{displayTransaction.payerAddress}</span>
          <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(displayTransaction.payerAddress ?? '', 'Payer address')}>
            <Copy className="size-3" />
          </Button>
        </div>
      ),
      icon: User
    },
    {
      label: 'Source',
      value: displayTransaction.source,
      icon: LinkIcon
    },
    {
      label: 'Timestamp',
      value: formatDate(displayTransaction.timestamp),
      icon: Clock
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        aria-label="Transaction details"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            e.preventDefault();
            handleClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Amount Summary */}
          <div className="bg-muted p-6 rounded-2xl border border-border flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Total Amount</p>
            <div className="text-3xl font-bold text-foreground">
              <CurrencyDisplay amount={displayTransaction.amountUsdc} currency="USDC" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              ≈ ₦{(displayTransaction.amountNgn ?? 0).toLocaleString()} NGN
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-4">
            {detailRows.map((row, i) => (
              <div key={i} className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <row.icon className="size-3.5" />
                  <span className="text-xs font-medium">{row.label}</span>
                </div>
                <div className="text-xs font-semibold text-foreground text-right">
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
          <Button className="bg-foreground text-background hover:bg-foreground/90" size="sm" onClick={openExplorer}>
            View in Explorer <ExternalLink className="w-3.5 h-3.5 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
