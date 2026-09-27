"use client";

import { Loader2, FileDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/ui';
import { StatusBadge } from '@/components/shared';
import type { ApiSettlement } from '@/lib/api/hooks';
import {
  buildInvoiceNumber,
  computeSettlementFees,
  formatUsdc,
  formatNgn,
  type InvoiceMerchant,
} from '@/lib/utils/pdf';

export type InvoicePreviewData =
  | { kind: 'single'; settlement: ApiSettlement }
  | { kind: 'batch'; settlements: ApiSettlement[] };

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: InvoicePreviewData | null;
  merchant: InvoiceMerchant;
  isDownloading: boolean;
  onDownload: () => void;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(dateString)
  );
}

/** Visual facsimile of a single settlement invoice, mirrors `renderInvoicePage` in `lib/utils/pdf.ts`. */
function SingleInvoicePreview({
  settlement,
  merchant,
}: {
  settlement: ApiSettlement;
  merchant: InvoiceMerchant;
}) {
  const fees = computeSettlementFees(settlement.amountUsdc);
  const rate =
    settlement.amountNgn && settlement.amountUsdc > 0 ? settlement.amountNgn / settlement.amountUsdc : null;

  return (
    <div className="rounded-xl border border-border bg-background p-5 text-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <p className="font-heading text-lg font-bold text-primary">BettaPay</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {merchant.businessName || 'Merchant'}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {merchant.email && <p>{merchant.email}</p>}
            {merchant.address && <p>{merchant.address}</p>}
            {merchant.registrationNumber && <p>Reg. No.: {merchant.registrationNumber}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">SETTLEMENT INVOICE</p>
          <p className="text-xs text-muted-foreground">{buildInvoiceNumber(settlement.id)}</p>
          <p className="text-xs text-muted-foreground">{formatDate(settlement.createdAt)}</p>
          <div className="mt-2">
            <StatusBadge status={settlement.status as 'completed' | 'pending' | 'failed'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 py-4 text-xs">
        <span className="text-muted-foreground">Settlement ID</span>
        <span className="text-right font-mono text-foreground">{settlement.id}</span>
        <span className="text-muted-foreground">Bank</span>
        <span className="text-right text-foreground">{settlement.bankName ?? '—'}</span>
        <span className="text-muted-foreground">Account Number</span>
        <span className="text-right text-foreground">{settlement.accountNumber ?? '—'}</span>
        <span className="text-muted-foreground">Exchange Rate</span>
        <span className="text-right text-foreground">
          {rate ? `NGN ${rate.toLocaleString('en-NG', { maximumFractionDigits: 2 })} / USDC` : '—'}
        </span>
        <span className="text-muted-foreground">Transaction Hash</span>
        <span className="truncate text-right font-mono text-foreground">{settlement.txHash ?? '—'}</span>
      </div>

      <div className="space-y-1.5 border-t border-border/50 pt-4 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross settlement amount</span>
          <span className="text-foreground">{formatUsdc(fees.gross)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Platform fee</span>
          <span className="text-foreground">- {formatUsdc(fees.fee)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-foreground">Net settlement (USDC)</span>
          <span className="text-foreground">{formatUsdc(fees.net)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
        <span className="text-xs font-medium text-muted-foreground">TOTAL PAID OUT</span>
        <span className="text-base font-bold text-foreground">
          {settlement.amountNgn != null ? formatNgn(settlement.amountNgn) : formatUsdc(fees.net)}
        </span>
      </div>
    </div>
  );
}

/** Compact list preview for a batch download — one row per invoice. */
function BatchInvoicePreview({ settlements }: { settlements: ApiSettlement[] }) {
  const totalNet = settlements.reduce((sum, s) => sum + computeSettlementFees(s.amountUsdc).net, 0);

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
        {settlements.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 p-3 text-xs">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{buildInvoiceNumber(s.id)}</p>
              <p className="text-muted-foreground">{formatDate(s.createdAt)}</p>
            </div>
            <span className="shrink-0 font-semibold text-foreground">{formatUsdc(computeSettlementFees(s.amountUsdc).net)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/50 p-3">
        <span className="text-xs font-medium text-muted-foreground">
          {settlements.length} invoice{settlements.length === 1 ? '' : 's'}
        </span>
        <span className="text-sm font-bold text-foreground">{formatUsdc(totalNet)}</span>
      </div>
    </div>
  );
}

/** Preview modal shown before an invoice PDF is generated (issue #790). */
export function InvoicePreviewModal({
  open,
  onOpenChange,
  data,
  merchant,
  isDownloading,
  onDownload,
}: InvoicePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription>
            Review the invoice details below before downloading the PDF.
          </DialogDescription>
        </DialogHeader>

        {data?.kind === 'single' && (
          <SingleInvoicePreview settlement={data.settlement} merchant={merchant} />
        )}
        {data?.kind === 'batch' && <BatchInvoicePreview settlements={data.settlements} />}

        <Button
          className="w-full bg-foreground text-background hover:bg-foreground/90"
          onClick={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 size-4" />
          )}
          {data?.kind === 'batch' ? 'Download All' : 'Download PDF'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
