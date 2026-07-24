"use client";

import { useState, useEffect } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Copy, Check, X, ExternalLink } from 'lucide-react';
import type { ApiPayment } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { formatDate, truncateAddress } from '@/lib/utils/format';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';

interface TransactionDrawerProps {
  transaction: ApiPayment | null;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Small copy-to-clipboard button, reused for id / hash / payload ───────────

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const { success, error } = useNotify();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
      className="text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
    </Button>
  );
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h3>
    <div className="space-y-2.5">{children}</div>
  </section>
);

const Row = ({
  label,
  children,
  copyValue,
}: {
  label: string;
  children: React.ReactNode;
  copyValue?: string | null;
}) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
    <div className="flex items-center gap-1.5 text-right text-sm font-medium text-foreground break-all">
      {children}
      {copyValue ? <CopyButton value={copyValue} label={label} /> : null}
    </div>
  </div>
);

const EmptySection = ({ message }: { message: string }) => (
  <p className="text-xs text-muted-foreground italic">{message}</p>
);

// ─── Drawer ───────────────────────────────────────────────────────────────────

export const TransactionDrawer = ({ transaction, isOpen, onClose }: TransactionDrawerProps) => {
  // Retain the last transaction while the closing slide-out animation plays,
  // since the parent clears `transaction` at the same moment it closes.
  const [tx, setTx] = useState<ApiPayment | null>(transaction);
  useEffect(() => {
    if (transaction) setTx(transaction);
  }, [transaction]);

  if (!tx) return null;

  const dash = '—';
  const explorerUrl = tx.txHash ? getStellarExplorerTxUrl(tx.txHash) : null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop – clicking it closes the drawer (handled by base-ui) */}
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'transition-opacity duration-300 ease-out',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            'motion-reduce:transition-none'
          )}
        />
        <DialogPrimitive.Popup
          // Escape key + click-outside are handled natively by base-ui Dialog.
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-background shadow-xl outline-none',
            'border-l border-border/50 sm:w-[400px] sm:max-w-[400px]',
            // Slide in/out from the right using base-ui's transition data attributes.
            'translate-x-0 transition-transform duration-300 ease-out',
            'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
            'motion-reduce:transition-none'
          )}
        >
          {/* Header: ID, status badge, close */}
          <div className="flex items-start justify-between gap-3 border-b border-border/50 p-4">
            <div className="min-w-0 space-y-1.5">
              <DialogPrimitive.Title className="font-heading text-base font-medium leading-none">
                Transaction Details
              </DialogPrimitive.Title>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {tx.id}
                </span>
                <CopyButton value={tx.id} label="Transaction ID" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={tx.status} />
              <DialogPrimitive.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close transaction details"
                  />
                }
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Amount summary */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/50 p-6 text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Amount
              </p>
              <div className="text-3xl font-bold text-foreground">
                <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
              </div>
              {tx.amountNgn != null && (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  ≈ ₦{tx.amountNgn.toLocaleString()} NGN
                </p>
              )}
            </div>

            {/* Basic Info */}
            <Section title="Basic Info">
              <Row label="Transaction ID" copyValue={tx.id}>
                <span className="font-mono text-xs">{truncateAddress(tx.id)}</span>
              </Row>
              <Row label="Status">
                <StatusBadge status={tx.status} />
              </Row>
              <Row label="Source">{tx.source ?? dash}</Row>
              <Row label="Date">{formatDate(tx.createdAt)}</Row>
            </Section>

            {/* Payment Details */}
            <Section title="Payment Details">
              <Row label="Amount (USDC)">
                <CurrencyDisplay amount={tx.amountUsdc} currency="USDC" />
              </Row>
              <Row label="Amount (NGN)">
                {tx.amountNgn != null ? (
                  <CurrencyDisplay amount={tx.amountNgn} currency="NGN" showDecimals={false} />
                ) : (
                  dash
                )}
              </Row>
              <Row label="FX Rate">
                {tx.fxRate != null ? `₦${tx.fxRate.toLocaleString()} / USDC` : dash}
              </Row>
              <Row
                label="Payer Address"
                copyValue={tx.payerAddress ?? undefined}
              >
                <span className="font-mono text-xs">
                  {tx.payerAddress ? truncateAddress(tx.payerAddress) : dash}
                </span>
              </Row>
              <Row label="Tx Hash" copyValue={tx.txHash ?? undefined}>
                <span className="font-mono text-xs">
                  {tx.txHash ? truncateAddress(tx.txHash) : dash}
                </span>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View transaction on Stellar Explorer"
                  >
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="size-3" />
                    </Button>
                  </a>
                )}
              </Row>
            </Section>

            {/* Settlement Info */}
            <Section title="Settlement Info">
              <Row label="Merchant ID" copyValue={tx.merchantId}>
                <span className="font-mono text-xs">{truncateAddress(tx.merchantId)}</span>
              </Row>
              {tx.stellarOpId ? (
                <Row label="Stellar Op ID" copyValue={tx.stellarOpId}>
                  <span className="font-mono text-xs">{tx.stellarOpId}</span>
                </Row>
              ) : (
                <EmptySection message="Settlement details will appear once funds are settled." />
              )}
            </Section>

            {/* Webhook Logs */}
            <Section title="Webhook Logs">
              <EmptySection message="No webhook events recorded for this transaction." />
            </Section>

            {/* Raw Payload */}
            <Section title="Raw Payload">
              <div className="relative">
                <div className="absolute right-2 top-2">
                  <CopyButton value={JSON.stringify(tx, null, 2)} label="Raw payload" />
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-border/50 bg-muted/40 p-3 pr-10 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(tx, null, 2)}
                </pre>
              </div>
            </Section>
          </div>

          {/* Footer: link to full detail */}
          <div className="border-t border-border/50 p-4">
            {explorerUrl ? (
              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-foreground text-background hover:bg-foreground/90" size="sm">
                  View full details on Explorer
                  <ExternalLink className="ml-2 size-3.5" />
                </Button>
              </a>
            ) : (
              <Button className="w-full" size="sm" variant="outline" disabled>
                No on-chain record available
              </Button>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
