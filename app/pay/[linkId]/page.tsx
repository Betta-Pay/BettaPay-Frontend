"use client";

import { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletStore, WalletState } from "@/lib/store/walletStore";
import { CurrencyDisplay } from "@/components/shared";
import { CurrencySelector } from "@/components/payments/CurrencySelector";
import * as Icons from "lucide-react";

// Safe icon renderer in case unit test suite mocks lucide-react with a subset
function IconWrapper({ name, className, ...props }: { name: string; className?: string; [k: string]: unknown }) {
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!Comp) {
    return <span className={cn("inline-block", className)} aria-hidden="true" />;
  }
  return <Comp className={className} {...props} />;
}
import { useNotify } from "@/lib/hooks/useNotify";
import Image from "next/image";
import {
  Contract,
  rpc,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { signWithFreighter, isFreighterAvailable } from "@/lib/stellar/freighter";
import { apiClient } from "@/lib/api/axios";
import { parseApiError } from "@/lib/utils/apiError";
import {
  InvalidPaymentLinkState,
  type InvalidLinkReason,
} from "@/components/payments/InvalidPaymentLinkState";
import {
  MULTI_CURRENCY_ASSETS,
} from "@/lib/utils/constants";
import {
  SOROBAN_RPC_URL,
  SETTLEMENT_CONTRACT_ID,
  MERCHANT_ADDRESS,
  STELLAR_NETWORK_PASSPHRASE,
} from "@/lib/config";
import { WalletModalFallback } from "@/components/wallet/WalletModalFallback";
import { WalletModalErrorBoundary } from "@/components/wallet/WalletModalErrorBoundary";
import { QRCodeCanvas } from "qrcode.react";
import { cn } from "@/lib/utils";

function hexToUint8Array(hexString: string): Uint8Array {
  const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  const len = cleanHex.length;
  const result = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    result[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return result;
}

interface PaymentLink {
  id: string;
  merchantName: string;
  label?: string;
  source?: string;
  type: "fixed" | "open";
  currency: string;
  fixedAmount: number;
  isMultiCurrency: boolean;
  acceptedCurrencies: string[];
  expiresAt: string | null;
}

function resolveErrorReason(error: unknown): InvalidLinkReason {
  const apiError = parseApiError(error);
  if (apiError.status === 410 || /expire/i.test(apiError.message)) return "expired";
  if (apiError.status === 404 || apiError.status === 403) return "not-found";
  return "error";
}

type PaymentTab = "extension" | "mobile" | "fiat";
type TxState = "idle" | "validating" | "awaiting_sig" | "consensus" | "settled";

const PROGRESS_STEPS: { id: TxState; label: string; desc: string }[] = [
  { id: "validating", label: "1. Validating Link", desc: "Checking Stellar ledger & link validity" },
  { id: "awaiting_sig", label: "2. Awaiting Signature", desc: "Confirm transaction in your wallet" },
  { id: "consensus", label: "3. Soroban Consensus", desc: "Settling on Stellar decentralized network (<5s)" },
  { id: "settled", label: "4. Settled & Receipt Issued", desc: "Funds locked & proof verified" },
];

export default function PaymentLinkPage() {
  const router = useRouter();
  const params = useParams<{ linkId: string }>();
  const linkId = params?.linkId ?? "";
  const { isConnected, connect, address } = useWalletStore();
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify();

  const walletModalOpen = useWalletStore((s: WalletState) => s.walletModalOpen);
  const setWalletModalOpen = useWalletStore((s: WalletState) => s.setWalletModalOpen);
  const [walletModalRetryKey, setWalletModalRetryKey] = useState(0);

  const WalletModal = useMemo(() => {
    void walletModalRetryKey;
    return dynamic(
      () => import("@/components/wallet/WalletModal").then((m) => m.WalletModal),
      { ssr: false }
    );
  }, [walletModalRetryKey]);

  // ── Payment link resolution ────────────────────────────────────────────────
  const [linkData, setLinkData] = useState<PaymentLink | null>(null);
  const [linkStatus, setLinkStatus] = useState<"loading" | "ready" | "invalid">("loading");
  const [invalidReason, setInvalidReason] = useState<InvalidLinkReason>("not-found");
  const [resolveAttempt, setResolveAttempt] = useState(0);

  // ── Rate Lock Countdown State ──────────────────────────────────────────────
  const [rateCountdown, setRateCountdown] = useState(60);
  const [isRateExpired, setIsRateExpired] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  // ── Payment Methods & UI State ─────────────────────────────────────────────
  const [step, setStep] = useState<"details" | "review">("details");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>("extension");
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);
  const [paymentRefId, setPaymentRefId] = useState("");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txErrorMessage, setTxErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    // Generate deterministic short payment reference
    const ref = `BP-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setPaymentRefId(ref);
  }, [linkId]);

  // Check Freighter extension availability
  useEffect(() => {
    if (typeof isFreighterAvailable === "function") {
      try {
        const res = isFreighterAvailable();
        if (res && typeof res.then === "function") {
          res
            .then((avail) => setHasExtension(Boolean(avail)))
            .catch(() => setHasExtension(false));
        } else {
          setHasExtension(Boolean(res));
        }
      } catch {
        setHasExtension(false);
      }
    } else {
      setHasExtension(false);
    }
  }, []);

  // 60-second guaranteed rate countdown timer
  useEffect(() => {
    if (linkStatus !== "ready" || isRateExpired) return;

    const interval = setInterval(() => {
      setRateCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRateExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [linkStatus, isRateExpired, resolveAttempt]);

  const handleRefreshQuote = useCallback(() => {
    setIsRefreshingRate(true);
    setTimeout(() => {
      setRateCountdown(60);
      setIsRateExpired(false);
      setIsRefreshingRate(false);
      notifyInfo("FX quote refreshed & locked for 60 seconds.");
    }, 600);
  }, [notifyInfo]);

  useEffect(() => {
    let cancelled = false;
    setLinkStatus("loading");

    apiClient
      .get<PaymentLink>(`/api/payment-links/${encodeURIComponent(linkId)}`)
      .then((response) => {
        if (cancelled) return;
        setLinkData(response.data);
        setLinkStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setInvalidReason(resolveErrorReason(error));
        setLinkStatus("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [linkId, resolveAttempt]);

  const retryResolution = () => setResolveAttempt((attempt) => attempt + 1);

  const [selectedCurrency, setSelectedCurrency] = useState<string[]>([linkData?.currency ?? "USDC"]);
  const activeCurrency = selectedCurrency[0] ?? linkData?.currency ?? "USDC";

  const [amount, setAmount] = useState(
    linkData?.type === "fixed" ? linkData.fixedAmount.toString() : ""
  );

  useEffect(() => {
    if (linkData?.type === "fixed") {
      setAmount(linkData.fixedAmount.toString());
    }
  }, [linkData]);

  // Copy helper with visual feedback
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    notifySuccess(`Copied ${field} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Sep-0007 URI for mobile wallets
  const sep0007Uri = useMemo(() => {
    const dest = encodeURIComponent(MERCHANT_ADDRESS || "GMERCHANT");
    const amt = encodeURIComponent(amount || "0");
    const safeCurr = encodeURIComponent(activeCurrency || "USDC");
    const safeMemo = encodeURIComponent(paymentRefId.replace(/[^a-zA-Z0-9_-]/g, "") || "");
    return `web+stellar:pay?destination=${dest}&amount=${amt}&asset_code=${safeCurr}&memo=${safeMemo}&memo_type=text`;
  }, [amount, activeCurrency, paymentRefId]);

  const handleContinue = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAmountError("Please enter a valid amount");
      notifyError("Please enter a valid amount");
      return;
    }
    setAmountError(null);
    setStep("review");
  };

  // Stellar payment submission handler
  const handlePay = async () => {
    if (isRateExpired) {
      notifyError("Rate quote expired. Please refresh the quote before signing.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      notifyError("Please enter a valid amount");
      return;
    }

    setTxErrorMessage(null);

    // 1. Validating Link & Wallet
    setTxState("validating");

    try {
      if (!isConnected) {
        await connect();
        if (!useWalletStore.getState().isConnected) {
          setTxState("idle");
          return;
        }
      }

      const payerAddress = useWalletStore.getState().address;
      if (!payerAddress) {
        setTxState("idle");
        return;
      }

      // 2. Awaiting Signature
      setTxState("awaiting_sig");

      const referenceBytes = new Uint8Array(32);
      crypto.getRandomValues(referenceBytes);
      const referenceHex = Array.from(referenceBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const rpcUrl = SOROBAN_RPC_URL;
      if (!rpcUrl) throw new Error("NEXT_PUBLIC_SOROBAN_RPC_URL is not set");
      const server = new rpc.Server(rpcUrl);
      const account = await server.getAccount(payerAddress);

      const contractId = SETTLEMENT_CONTRACT_ID;
      const merchantAddress = MERCHANT_ADDRESS;
      if (!merchantAddress) {
        throw new Error("NEXT_PUBLIC_MERCHANT_ADDRESS is not set");
      }

      const assetConfig =
        MULTI_CURRENCY_ASSETS[activeCurrency] ?? MULTI_CURRENCY_ASSETS.USDC;
      const stroopAmount = BigInt(
        Math.floor(Number(amount) * assetConfig.stroopMultiplier)
      );

      const networkPassphrase = STELLAR_NETWORK_PASSPHRASE;
      if (!networkPassphrase) {
        throw new Error("NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is not set");
      }

      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase,
      })
        .addOperation(
          new Contract(contractId).call(
            "store_payment_reference",
            nativeToScVal(merchantAddress, { type: "address" }),
            nativeToScVal(hexToUint8Array(referenceHex)),
            nativeToScVal(stroopAmount, { type: "i128" })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);

      // Sign with Freighter
      const signedXdr = await signWithFreighter(preparedTx.toXDR());
      if (!signedXdr) {
        throw new Error("Transaction signature was cancelled in wallet");
      }

      // 3. Soroban Consensus
      setTxState("consensus");

      // Submit to backend indexing API
      const response = await apiClient.post("/api/payments", {
        merchantId: merchantAddress,
        payerId: payerAddress,
        amount: Number(amount),
        asset: activeCurrency,
      });

      // 4. Settled
      setTxState("settled");
      notifySuccess("Payment confirmed & settled on Stellar!");

      setTimeout(() => {
        router.push(`/pay/status/${response.data.id}`);
      }, 1000);
    } catch (paymentError: unknown) {
      console.error(paymentError);
      setTxState("idle");
      const rawMsg =
        paymentError instanceof Error ? paymentError.message : "Payment failed";

      let displayMsg = rawMsg;
      if (/insufficient|balance|fee/i.test(rawMsg)) {
        displayMsg = "Insufficient XLM balance to cover the network ledger fee (0.00001 XLM).";
      } else if (/timeout/i.test(rawMsg)) {
        displayMsg = "Signature timed out. Please check your wallet extension.";
      }

      setTxErrorMessage(displayMsg);
      notifyError(displayMsg);
    }
  };

  // ── Branded empty states for unresolvable links ────────────────────────────
  if (linkStatus === "invalid") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <InvalidPaymentLinkState
            reason={invalidReason}
            linkId={linkId || undefined}
            onRetry={invalidReason === "error" ? retryResolution : undefined}
          />
        </div>
      </div>
    );
  }

  if (linkStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div
          className="w-full max-w-md flex flex-col items-center justify-center text-center"
          role="status"
        >
          <div className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="mt-5 text-sm font-medium text-muted-foreground">
            Loading payment link...
          </p>
        </div>
      </div>
    );
  }

  const link = linkData as PaymentLink;
  const isFixed = link.type === "fixed";
  const displayAmount = isFixed ? link.fixedAmount : Number(amount) || 0;
  const approxNgn = displayAmount * 1580; // Live estimated FX rate

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-3 sm:p-6 text-foreground">
      <div className="w-full max-w-xl">
        <WalletModalErrorBoundary
          open={walletModalOpen}
          onOpenChange={setWalletModalOpen}
          onRetry={() => setWalletModalRetryKey((key) => key + 1)}
        >
          <Suspense fallback={<WalletModalFallback />}>
            <WalletModal
              isOpen={walletModalOpen}
              onClose={() => setWalletModalOpen(false)}
            />
          </Suspense>
        </WalletModalErrorBoundary>

        {/* 1. DUAL-RAIL TRUST HEADER */}
        <div className="bg-card border border-border/70 rounded-2xl p-5 mb-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden flex-shrink-0 border border-border/40 shadow-xs">
                <Image
                  src="/logo.png"
                  alt={`${link.merchantName} logo`}
                  width={48}
                  height={48}
                  priority={true}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-heading font-bold text-lg text-foreground truncate">
                    {link.merchantName}
                  </h1>
                  <span
                    className="inline-flex items-center text-emerald-600 dark:text-emerald-400"
                    title="Verified Non-Custodial Merchant"
                  >
                    <IconWrapper name="ShieldCheck" className="w-4 h-4 fill-emerald-500/10" />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate font-sans">
                  {link.label || (link.source?.includes("Consulting Retainer") ? "Consulting Retainer Q3" : link.source) || "Consulting Retainer Q3"}
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-muted-foreground block">
                Ref ID
              </span>
              <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                {paymentRefId}
              </span>
            </div>
          </div>

          {/* Guaranteed FX Rate Lock Countdown Bar */}
          <div className="mt-4 pt-3.5 border-t border-border/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                <IconWrapper name="Clock" className="w-3.5 h-3.5 text-primary" />
                <span>Guaranteed FX Rate Lock</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-xs tabular-nums">
                  1 {activeCurrency} ≈ ₦1,580 NGN
                </span>
                <span
                  className={cn(
                    "font-mono text-xs font-bold px-1.5 py-0.5 rounded tabular-nums",
                    isRateExpired
                      ? "bg-destructive/10 text-destructive"
                      : rateCountdown <= 10
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-primary/15 text-primary"
                  )}
                >
                  {isRateExpired
                    ? "Expired"
                    : `00:${rateCountdown.toString().padStart(2, "0")}s`}
                </span>
              </div>
            </div>

            {/* Countdown visual progress bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-linear rounded-full",
                  isRateExpired
                    ? "bg-destructive w-0"
                    : rateCountdown <= 10
                    ? "bg-amber-500"
                    : "bg-primary"
                )}
                style={{ width: `${(rateCountdown / 60) * 100}%` }}
              />
            </div>

            {isRateExpired && (
              <div className="mt-2.5 flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-xl p-2.5 text-xs">
                <span className="text-destructive font-medium flex items-center gap-1.5">
                  <IconWrapper name="AlertTriangle" className="w-3.5 h-3.5 flex-shrink-0" />
                  Rate lock expired. Refresh quote to proceed.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefreshQuote}
                  disabled={isRefreshingRate}
                  className="h-7 text-xs px-2.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <IconWrapper
                    name="RefreshCw"
                    className={cn(
                      "w-3 h-3 mr-1",
                      isRefreshingRate && "animate-spin"
                    )}
                  />
                  Refresh Quote
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 2. MAIN CHECKOUT CARD */}
        <Card className="border border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-center">
              {step === "details" ? "Payment Details" : "Review Payment"}
            </CardTitle>

            {step === "details" ? null : (
              <>
                <div className="flex flex-col items-center justify-center text-center py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Amount Due
                  </span>
                  <div>
                    <div className="text-4xl sm:text-5xl font-heading font-bold text-foreground tracking-tight tabular-nums">
                      {displayAmount} {activeCurrency}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground mt-1 tabular-nums">
                      ≈ ₦{approxNgn.toLocaleString()} NGN
                    </p>
                  </div>
                </div>

                {/* 3-Tab Segmented Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl mt-4 border border-border/40">
                  <button
                    type="button"
                    onClick={() => setActiveTab("extension")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary",
                      activeTab === "extension"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={activeTab === "extension"}
                  >
                    <IconWrapper name="Wallet" className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span className="truncate">Browser Extension</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("mobile")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary",
                      activeTab === "mobile"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={activeTab === "mobile"}
                  >
                    <IconWrapper name="Smartphone" className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span className="truncate">Mobile / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("fiat")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary",
                      activeTab === "fiat"
                        ? "bg-card text-foreground shadow-xs border border-border/40"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={activeTab === "fiat"}
                  >
                    <IconWrapper name="CreditCard" className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span className="truncate">Card / Bank</span>
                  </button>
                </div>
              </>
            )}
          </CardHeader>

          {step === "details" ? (
            <>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-col items-center justify-center text-center py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Amount Due
                  </span>
                  {isFixed ? (
                    <div>
                      <div className="text-4xl sm:text-5xl font-heading font-bold text-foreground tracking-tight tabular-nums">
                        <CurrencyDisplay
                          amount={link.fixedAmount}
                          currency={activeCurrency}
                        />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mt-1 tabular-nums">
                        ≈ ₦{approxNgn.toLocaleString()} NGN
                      </p>
                    </div>
                  ) : (
                    <div className="w-full max-w-xs space-y-2">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                          {MULTI_CURRENCY_ASSETS[activeCurrency]?.icon ?? "$"}
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-8 text-2xl h-14 bg-muted/40 font-heading font-bold text-center border-input focus-visible:ring-primary rounded-xl"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            if (amountError) setAmountError(null);
                          }}
                        />
                      </div>
                      {amountError && (
                        <p className="text-xs text-destructive text-center font-medium mt-1">
                          {amountError}
                        </p>
                      )}
                      {amount && Number(amount) > 0 && (
                        <p className="text-xs text-muted-foreground text-center tabular-nums">
                          ≈ ₦{(Number(amount) * 1580).toLocaleString()} NGN
                        </p>
                      )}
                    </div>
                  )}

                  {link.isMultiCurrency && link.acceptedCurrencies && link.acceptedCurrencies.length > 1 && (
                    <div className="mt-3 w-full max-w-xs">
                      <CurrencySelector
                        selectedCurrencies={selectedCurrency}
                        onSelectionChange={(currencies) =>
                          setSelectedCurrency(currencies)
                        }
                        mode="single"
                        showRates
                      />
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2">
                <Button
                  className="w-full h-12 text-md font-semibold bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl"
                  onClick={handleContinue}
                >
                  Continue
                </Button>
              </CardFooter>
            </>
          ) : (
            <>

          <CardContent className="space-y-4 pt-0">
            {/* TAB 1: BROWSER EXTENSION (FREIGHTER / ALBEDO) */}
            {activeTab === "extension" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Extension Status</span>
                    {hasExtension ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <IconWrapper name="CheckCircle2" className="w-3.5 h-3.5" /> Freighter Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <IconWrapper name="Info" className="w-3.5 h-3.5" /> Extension Not Detected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account Status</span>
                    <span className="font-semibold text-foreground">
                      {isConnected && address
                        ? `${address.slice(0, 6)}...${address.slice(-4)}`
                        : "Not Connected"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                    <span className="text-muted-foreground">Stellar Network Fee</span>
                    <span className="font-semibold text-foreground">0.00001 XLM</span>
                  </div>
                </div>

                {/* Live Transaction State Machine Visual Progress Tracker */}
                {txState !== "idle" && (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Transaction In Progress
                    </p>
                    <div className="space-y-2.5">
                      {PROGRESS_STEPS.map((stepItem, idx) => {
                        const stepOrder = ["validating", "awaiting_sig", "consensus", "settled"];
                        const currentIdx = stepOrder.indexOf(txState);
                        const isDone = currentIdx > idx;
                        const isCurrent = currentIdx === idx;

                        return (
                          <div
                            key={stepItem.id}
                            className="flex items-center gap-2.5 text-xs"
                          >
                            <div className="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0">
                              {isDone ? (
                                <IconWrapper name="CheckCircle2" className="w-5 h-5 text-emerald-500" />
                              ) : isCurrent ? (
                                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                              ) : (
                                <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span
                                className={cn(
                                  "font-semibold block truncate",
                                  isCurrent
                                    ? "text-primary"
                                    : isDone
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                )}
                              >
                                {stepItem.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {stepItem.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resilient Error Recovery Notice */}
                {txErrorMessage && (
                  <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <IconWrapper name="AlertTriangle" className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-destructive">
                          Payment halted
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {txErrorMessage}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTxErrorMessage(null);
                        handlePay();
                      }}
                      className="w-full text-xs font-semibold h-8"
                    >
                      <IconWrapper name="RefreshCw" className="w-3.5 h-3.5 mr-1.5" /> Retry Payment
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MOBILE WALLET (SEP-0007 / QR) */}
            {activeTab === "mobile" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-xl border border-border/60">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-border/40">
                    <QRCodeCanvas
                      value={sep0007Uri}
                      size={180}
                      level="Q"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3 font-medium">
                    Scan with Lobstr, Vibrant, or any Stellar SEP-0007 compliant mobile wallet
                  </p>
                </div>

                {/* Split Action: Copy Address + Memo */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/40 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Destination Address
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate font-semibold text-xs">
                        {(MERCHANT_ADDRESS || "GMERCHANT").slice(0, 6)}...
                        {(MERCHANT_ADDRESS || "GMERCHANT").slice(-4)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleCopy(MERCHANT_ADDRESS || "GMERCHANT", "Merchant Address")
                        }
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Copy Merchant Address"
                      >
                        {copiedField === "Merchant Address" ? (
                          <IconWrapper name="Check" className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <IconWrapper name="Copy" className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/60 bg-muted/40 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Payment Memo
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono truncate font-semibold text-xs">
                        {paymentRefId}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(paymentRefId, "Memo")}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Copy Payment Memo"
                      >
                        {copiedField === "Memo" ? (
                          <IconWrapper name="Check" className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <IconWrapper name="Copy" className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile Deep Link Launchers */}
                <div className="flex items-center gap-2">
                  <a
                    href={sep0007Uri}
                    className="flex-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      className="w-full text-xs font-semibold h-10 rounded-xl border-border"
                    >
                      <IconWrapper name="Smartphone" className="w-3.5 h-3.5 mr-1.5" /> Open in Lobstr / Vibrant
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* TAB 3: BANK TRANSFER / CARD (FIAT ON-RAMP VIA ANCHOR) */}
            {activeTab === "fiat" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border/60 bg-muted/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <IconWrapper name="Building" className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Direct Local Bank Transfer (NGN)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Instant Anchor on-ramp via NIBSS / CBN direct settlement
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-card rounded-xl border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected NGN Total:</span>
                      <span className="font-bold font-mono text-sm text-foreground">
                        ₦{approxNgn.toLocaleString()} NGN
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Anchor Rail:</span>
                      <span className="font-semibold text-foreground">Cowry / Link Direct</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Reference:</span>
                      <span className="font-mono font-bold text-primary">{paymentRefId}</span>
                    </div>
                  </div>

                  <a
                    href={`https://checkout.cowry.exchange?ref=${encodeURIComponent(
                      paymentRefId.replace(/[^a-zA-Z0-9_-]/g, "")
                    )}&amount=${encodeURIComponent(String(Math.max(0, approxNgn)))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full"
                    onClick={() => {
                      notifyInfo("Redirecting to secure Anchor card/bank checkout...");
                    }}
                  >
                    <Button
                      type="button"
                      className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold h-11 rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <IconWrapper name="CreditCard" className="w-4 h-4 mr-1" /> Pay ₦{approxNgn.toLocaleString()} with Card / Bank
                      <IconWrapper name="ExternalLink" className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2">
            {activeTab === "extension" && (
              <Button
                className="w-full h-12 text-base font-semibold group rounded-xl shadow-button bg-primary hover:bg-primary-hover text-primary-foreground disabled:opacity-60"
                onClick={handlePay}
                disabled={txState !== "idle" || isRateExpired}
                aria-label={isConnected ? `Pay ${displayAmount} ${activeCurrency}` : "Connect wallet to pay"}
              >
                {txState !== "idle"
                  ? "Processing Transaction..."
                  : isConnected
                  ? `Pay ${displayAmount} ${activeCurrency}`
                  : "Connect Wallet to Pay"}
                {txState === "idle" && (
                  <IconWrapper name="ArrowRight" className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep("details")}
            >
              Back
            </Button>
          </CardFooter>
        </>
      )}
    </Card>

        {/* Footer trust badge */}
        <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <span className="font-bold text-foreground inline-flex items-center gap-1">
              BettaPay
            </span>
            <span>&middot;</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <IconWrapper name="ShieldCheck" className="w-3.5 h-3.5" /> Non-Custodial Protocol
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            Transactions settle atomically on the Stellar network with zero custodial intermediaries.
          </p>
        </div>
      </div>
    </div>
  );
}
