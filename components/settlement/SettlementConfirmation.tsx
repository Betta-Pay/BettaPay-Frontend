"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { TransactionProgress } from "@/components/settlement/TransactionProgress";
import {
  Building2,
  Download,
  CheckCircle2,
  ArrowRight,
  Banknote,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";

interface SettlementConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  amountUsdc?: number;
  amountNgn?: number;
  exchangeRate?: number;
  feePercent?: number;
  expectedDelivery?: string;
  bankName?: string;
  accountNumber?: string;
}

type SettlementState = "summary" | "processing" | "receipt";

const MOCK_TX_HASH = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8f9a0b1c2d3e4f5a6b7c8d9e0f";

export const SettlementConfirmation = ({
  isOpen,
  onClose,
  amountUsdc = 12450.00,
  amountNgn = 19297500,
  exchangeRate = 1550,
  feePercent = 1,
  expectedDelivery = "24-48 business hours",
  bankName = "GTBank",
  accountNumber = "012****567",
}: SettlementConfirmationProps) => {
  const [state, setState] = useState<SettlementState>("summary");
  const [confirmed, setConfirmed] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);

  const feeAmount = amountUsdc * (feePercent / 100);
  const netAmount = amountUsdc - feeAmount;
  const netAmountNgn = netAmount * exchangeRate;

  const handleClose = useCallback(() => {
    setState("summary");
    setConfirmed(false);
    setProcessingStep(0);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    if (!confirmed) return;
    setState("processing");
    setProcessingStep(0);
  }, [confirmed]);

  useEffect(() => {
    if (state !== "processing") return;
    if (processingStep < 3) {
      const timer = setTimeout(() => setProcessingStep((p) => p + 1), 1200);
      return () => clearTimeout(timer);
    }
    setState("receipt");
  }, [state, processingStep]);

  const handleDownloadReceipt = useCallback(() => {
    window.print();
  }, []);

  const receiptDate = formatDate(new Date().toISOString());

  if (state === "processing") {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Processing Settlement
            </DialogTitle>
            <DialogDescription>
              Please wait while your settlement is being processed on the Stellar network.
            </DialogDescription>
          </DialogHeader>
          <TransactionProgress currentStep={processingStep} />
          <DialogFooter>
            <Button variant="outline" disabled className="w-full">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (state === "receipt") {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:relative print:inset-auto print:p-0">
          <div className="bg-popover rounded-xl border border-border/50 shadow-lg max-w-md w-full p-6 space-y-6 print:shadow-none print:border-0 print:max-w-full">
            <div className="text-center space-y-2 print:mb-6">
              <div className="w-12 h-12 bg-success/20 dark:bg-success/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-success dark:text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-foreground print:text-2xl">Settlement Receipt</h2>
              <p className="text-xs text-muted-foreground print:hidden">Settlement completed successfully</p>
            </div>

            <div className="space-y-3 print:space-y-2">
              <div className="bg-muted rounded-xl p-4 space-y-3 print:bg-gray-50 print:border print:border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">Transaction Hash</span>
                  <span className="text-xs font-mono font-semibold text-foreground print:text-gray-900">{MOCK_TX_HASH}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">Settled Amount</span>
                  <span className="text-sm font-bold text-foreground print:text-gray-900">
                    <CurrencyDisplay amount={netAmount} />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">NGN Equivalent</span>
                  <span className="text-sm font-bold text-foreground print:text-gray-900">₦{netAmountNgn.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">Exchange Rate</span>
                  <span className="text-xs font-semibold text-foreground print:text-gray-900">₦{exchangeRate.toLocaleString()} / USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">Platform Fee</span>
                  <span className="text-xs font-semibold text-foreground print:text-gray-900">
                    <CurrencyDisplay amount={feeAmount} /> ({feePercent}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground print:text-gray-500">Date</span>
                  <span className="text-xs font-semibold text-foreground print:text-gray-900">{receiptDate}</span>
                </div>
              </div>

              <div className="border border-border rounded-xl p-4 space-y-3 print:border-gray-200">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider print:text-gray-500">Destination Bank</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground print:text-gray-900">{bankName}</p>
                    <p className="text-xs text-muted-foreground print:text-gray-600">{accountNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 print:hidden">
              <Button onClick={handleDownloadReceipt} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
              <Button variant="outline" onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>

            <div className="hidden print:block print:text-center print:text-xs print:text-gray-400 print:mt-8 print:border-t print:border-gray-200 print:pt-4">
              BettaPay Settlement Receipt · Generated on {receiptDate}
            </div>
          </div>
        </div>
        <div className="fixed inset-0 bg-black/10 z-40 print:hidden" onClick={handleClose} />
      </>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            Confirm Settlement
          </DialogTitle>
          <DialogDescription>
            Review the details below before initiating the USDC → NGN conversion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="bg-muted p-5 rounded-2xl border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
              Amount to Settle
            </p>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                <CurrencyDisplay amount={amountUsdc} />
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                ≈ ₦{amountNgn.toLocaleString()} NGN
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Exchange Rate</span>
              <span className="text-xs font-semibold text-foreground">₦{exchangeRate.toLocaleString()} / USDC</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Effective Rate (incl. fee)</span>
              <span className="text-xs font-semibold text-foreground">
                ₦{(exchangeRate * (1 - feePercent / 100)).toLocaleString()} / USDC
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">Platform Fee ({feePercent}%)</span>
              <span className="text-xs font-semibold text-foreground">
                <CurrencyDisplay amount={feeAmount} />
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">You&apos;ll Receive (USDC)</span>
              <span className="text-xs font-bold text-foreground">
                <CurrencyDisplay amount={netAmount} />
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">You&apos;ll Receive (NGN)</span>
              <span className="text-xs font-bold text-foreground">₦{netAmountNgn.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl border border-border">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Expected delivery: {expectedDelivery}</span>
          </div>

          <div className="border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination Bank</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{bankName}</p>
                <p className="text-xs text-muted-foreground">{accountNumber}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/30 bg-primary/10 dark:border-primary/30 dark:bg-primary/10">
            <AlertTriangle className="w-4 h-4 text-primary dark:text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary dark:text-primary">This action is irreversible</p>
              <p className="text-xs text-primary dark:text-primary mt-0.5">
                Once confirmed, the settlement will be processed on-chain and cannot be reversed.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30 focus:ring-2"
            />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
              I understand this is irreversible and confirm the settlement details above.
            </span>
          </label>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className={cn(
              "flex-1 transition-all",
              confirmed && "shadow-sm shadow-primary/20"
            )}
          >
            Confirm Settlement
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
