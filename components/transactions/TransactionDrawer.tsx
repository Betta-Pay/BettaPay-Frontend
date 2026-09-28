"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Copy, Check, X, ExternalLink } from 'lucide-react';
import type { ApiPayment } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { formatDate, truncateAddress } from '@/lib/utils/format';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { useWalletStore } from '@/lib/store/walletStore';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';
import {
  decodeSorobanInvocation,
  fetchTransactionEnvelope,
  type SorobanInvocation,
} from '@/lib/stellar/sorobanInvocation';

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

  const { isSigning, walletConnectPending } = useWalletStore();

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      disabled={isSigning || walletConnectPending}
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

/** Renders a decoded Soroban argument as a readable string (bigint-safe). */
function formatSorobanArg(value: unknown): string {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) {
    return Array.from(value, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
  } catch {
    return String(value);
  }
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export const TransactionDrawer = ({ transaction, isOpen, onClose }: TransactionDrawerProps) => {
  // Retain the last transaction while the closing slide-out animation plays,
  // since the parent clears `transaction` at the same moment it closes.
  const [tx, setTx] = useState<ApiPayment | null>(transaction);
  // Three separate primitive selectors, not one selector returning a new
  // object each call — zustand v5's useStore doesn't memoize the selector
  // result itself, so an object-returning selector fails React's
  // useSyncExternalStore consistency check and infinite-loops the moment
  // this component actually mounts (pre-existing bug, never caught because
  // every other test mocked TransactionDrawer out entirely).
  const network = useWalletStore((s) => s.network);
  const isSigning = useWalletStore((s) => s.isSigning);
  const walletConnectPending = useWalletStore((s) => s.walletConnectPending);

  // Soroban contract invocation (issue #793): fetched and decoded from the
  // transaction's envelope XDR when a hash is available. `null` covers both
  // "not fetched yet" and "not a Soroban invocation" — the section below
  // simply doesn't render either way, so ordinary payments look unchanged.
  const [invocation, setInvocation] = useState<SorobanInvocation | null>(null);

  useEffect(() => {
    setInvocation(null);
    const txHash = transaction?.txHash;
    if (!txHash) return;

    let cancelled = false;
    fetchTransactionEnvelope(txHash, network).then((envelopeXdr) => {
      if (cancelled || !envelopeXdr) return;
      setInvocation(decodeSorobanInvocation(envelopeXdr, network));
    });

    return () => {
      cancelled = true;
    };
  }, [transaction?.txHash, network]);

  // History / focus management refs
  const popupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const hasPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (transaction) setTx(transaction);
  }, [transaction]);

  // Push history state when opening, handle popstate (browser back), focus, and explicit Esc.
  useEffect(() => {
    if (!isOpen) return;

    // Save the element that triggered the drawer so focus can be restored on close.
    triggerRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the drawer on next frame (after portal mounts).
    const raf = requestAnimationFrame(() => {
      const el = popupRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? el).focus();
    });

    // History integration: push a state so browser back closes the drawer.
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ transactionDrawerOpen: true }, '');
        hasPushedRef.current = true;
      } catch {
        // pushState can throw in some iframe / test environments — ignore.
      }
    }

    const handlePopState = () => {
      if (hasPushedRef.current) {
        hasPushedRef.current = false;
        const t = triggerRef.current;
        // Restore focus after the drawer unmounts / closes.
        requestAnimationFrame(() => t?.focus?.());
        onCloseRef.current();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Explicit Esc path: if we pushed history, go back to keep history consistent.
        if (hasPushedRef.current) {
          hasPushedRef.current = false;
          try {
            if (typeof window !== 'undefined' && window.history.state?.transactionDrawerOpen) {
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
  }, [isOpen, transaction?.id]);

  const handleClose = useCallback(() => {
    if (hasPushedRef.current && typeof window !== 'undefined') {
      hasPushedRef.current = false;
      try {
        if (window.history.state?.transactionDrawerOpen) {
          window.history.back();
        }
      } catch {}
    }
    const t = triggerRef.current;
    requestAnimationFrame(() => t?.focus?.());
    onCloseRef.current();
  }, []);

  // Restore focus when isOpen becomes false (e.g., parent closed directly).
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      const t = triggerRef.current;
      const shouldRestore =
        document.activeElement === document.body ||
        popupRef.current?.contains(document.activeElement);
      if (shouldRestore) {
        requestAnimationFrame(() => t?.focus?.());
      }
      const id = setTimeout(() => {
        // Keep the ref until the close animation completes.
        if (!hasPushedRef.current) triggerRef.current = null;
      }, 350);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  if (!tx) return null;

  const dash = '—';
  const explorerUrl = tx.txHash ? getStellarExplorerTxUrl(tx.txHash, network) : null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop – clicking it closes the drawer (handled by base-ui, funnelled through handleClose) */}
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'transition-opacity duration-300 ease-out',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            'motion-reduce:transition-none'
          )}
        />
        <DialogPrimitive.Popup
          ref={popupRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            } else if (e.key === 'Tab') {
              if (!popupRef.current) return;
              const focusableElements = popupRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])'
              );
              const focusable = Array.from(focusableElements).filter(
                (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
              );
              if (focusable.length === 0) return;
              
              const first = focusable[0];
              const last = focusable[focusable.length - 1];

              if (e.shiftKey) {
                if (document.activeElement === first || document.activeElement === popupRef.current) {
                  e.preventDefault();
                  last.focus();
                }
              } else {
                if (document.activeElement === last || document.activeElement === popupRef.current) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }
          }}
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
                    disabled={isSigning || walletConnectPending}
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
                    <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" disabled={isSigning || walletConnectPending}>
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

            {/* Contract Invocation (issue #793) — only present for Soroban transactions */}
            {invocation && (
              <Section title="Contract Invocation">
                <Row label="Contract ID" copyValue={invocation.contractId}>
                  <span className="font-mono text-xs">{truncateAddress(invocation.contractId)}</span>
                </Row>
                <Row label="Function">
                  <span className="font-mono text-xs">{invocation.functionName}</span>
                </Row>
                {invocation.args.length > 0 ? (
                  invocation.args.map((arg, i) => (
                    <Row key={i} label={`Arg ${i + 1}`}>
                      <span className="break-all font-mono text-xs">{formatSorobanArg(arg)}</span>
                    </Row>
                  ))
                ) : (
                  <EmptySection message="This invocation takes no arguments." />
                )}
              </Section>
            )}

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
                <Button className="w-full bg-foreground text-background hover:bg-foreground/90" size="sm" disabled={isSigning || walletConnectPending}>
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
