"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletStore } from "@/lib/store/walletStore";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { ArrowRight, QrCode } from "lucide-react";
import { useNotify } from "@/lib/hooks/useNotify";
import Image from "next/image";
import {
  Contract,
  rpc,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { signWithFreighter } from "@/lib/stellar/freighter";
import { apiClient } from "@/lib/api/axios";
import { WalletModalFallback } from "@/components/wallet/WalletModalFallback";
const WalletModal = dynamic(
  () => import("@/components/wallet/WalletModal").then((m) => m.WalletModal),
  { ssr: false },
);

export default function PaymentLinkPage() {
  const router = useRouter();
  const { isConnected, connect, address } = useWalletStore();
  const { error: notifyError } = useNotify();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Mock data for this link
  const linkData = {
    merchantName: "Merchant Corp",
    label: "Consulting Retainer Q3",
    type: "open", // 'fixed' or 'open'
    currency: "USDC",
    fixedAmount: 0,
  };

  const [amount, setAmount] = useState(
    linkData.type === "fixed" ? linkData.fixedAmount.toString() : "",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"details" | "review">("details");

  const handleContinue = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      notifyError("Please enter a valid amount");
      return;
    }
    setStep("review");
  };

  const handlePay = async () => {
    if (!isConnected) {
      await connect();
      if (!useWalletStore.getState().isConnected) return;
    }

    const payerAddress = useWalletStore.getState().address;
    if (!payerAddress) return;

    setIsProcessing(true);

    try {
      // 1. Generate Payment Reference (32 bytes hex string)
      const referenceBytes = new Uint8Array(32);
      crypto.getRandomValues(referenceBytes);
      const referenceHex = Array.from(referenceBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // 2. Build Soroban Transaction
      const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
      if (!rpcUrl) throw new Error('NEXT_PUBLIC_SOROBAN_RPC_URL is not set');
      const server = new rpc.Server(rpcUrl);
      const account = await server.getAccount(payerAddress);

      const contractId =
        process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID ||
        "CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB";
      // Merchant address: read from env var so it can be set per-environment.
      // In production this should be derived from the payment link data fetched
      // via the linkId param rather than a global env var.
      const merchantAddress = process.env.NEXT_PUBLIC_MERCHANT_ADDRESS;
      if (!merchantAddress) {
        throw new Error('NEXT_PUBLIC_MERCHANT_ADDRESS is not set');
      }

      // Amount in stroops (1 USDC = 10^7 stroops)
      const stroopAmount = BigInt(Math.floor(Number(amount) * 10_000_000));

      const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE;
      if (!networkPassphrase) throw new Error('NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE is not set');

      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase,
      })
        .addOperation(
          new Contract(contractId).call(
            "store_payment_reference",
            nativeToScVal(merchantAddress, { type: "address" }),
            nativeToScVal(Buffer.from(referenceHex, "hex")),
            nativeToScVal(stroopAmount, { type: "i128" }),
          ),
        )
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);

      // 3. Sign with Freighter
      const signedXdr = await signWithFreighter(preparedTx.toXDR());
      if (!signedXdr) {
        throw new Error("User cancelled signing or Freighter error");
      }

      // 4. Submit to Backend API (which will track it and indexer will pick it up)
      const response = await apiClient.post("/api/payments", {
        merchantId: merchantAddress,
        payerId: payerAddress,
        amount: Number(amount),
        asset: linkData.currency,
      });

      // Redirect to status page with the backend payment ID
      router.push(`/pay/status/${response.data.id}`);
    } catch (paymentError: unknown) {
      console.error(paymentError);
      const errorMessage =
        paymentError instanceof Error ? paymentError.message : "Payment failed";
      notifyError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <WalletModalFallback
              open={walletModalOpen}
              onOpenChange={setWalletModalOpen}
            />
          }
        >
          <WalletModal
            open={walletModalOpen}
            onOpenChange={setWalletModalOpen}
          />
        </Suspense>

        {/* Merchant Branding Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4 overflow-hidden">
            <Image
              src="/logo.png"
              alt={`${linkData.merchantName} logo`}
              width={64}
              height={64}
              priority={true}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-xl font-semibold">{linkData.merchantName}</h1>
          <p className="text-muted-foreground text-sm">{linkData.label}</p>
        </div>

        <AnimatePresence mode="wait">
          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border bg-card shadow-sm rounded-xl">
                <CardHeader>
                  <h2 className="text-lg font-medium text-center">
                    Payment Details
                  </h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {linkData.type === "fixed" ? (
                    <div className="text-center py-6">
                      <div className="text-4xl font-bold text-foreground">
                        <CurrencyDisplay
                          amount={linkData.fixedAmount}
                          currency={linkData.currency}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        ≈ ₦{(linkData.fixedAmount * 1550).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Amount ({linkData.currency})
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          placeholder="0.00"
                          className="pl-8 text-lg h-14 bg-transparent border-input focus-visible:ring-primary"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    className="w-full h-12 text-md font-medium"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-muted-foreground"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Show QR Code
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="border bg-card shadow-sm rounded-xl">
                <CardHeader>
                  <h2 className="text-lg font-medium text-center">
                    Review Payment
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-transparent rounded-xl p-4 space-y-3 border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">
                        <CurrencyDisplay
                          amount={Number(amount)}
                          currency={linkData.currency}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Network Fee</span>
                      <span className="font-semibold">0.00001 XLM</span>
                    </div>
                    <div className="h-px bg-border/50 w-full" />
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold text-primary">
                        <CurrencyDisplay
                          amount={Number(amount)}
                          currency={linkData.currency}
                        />
                      </span>
                    </div>
                  </div>

                  {isConnected && address && (
                    <div className="text-sm text-center text-muted-foreground">
                      Sending from:{" "}
                      <span className="font-mono text-foreground">
                        {address.substring(0, 6)}...
                        {address.substring(address.length - 4)}
                      </span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button
                    className="w-full h-12 text-md font-medium group"
                    onClick={handlePay}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Processing..."
                      : isConnected
                        ? "Sign & Pay"
                        : "Connect Wallet to Pay"}
                    {!isProcessing && (
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={() => setStep("details")}
                    disabled={isProcessing}
                  >
                    Back
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <Image
            src="/logo.png"
            alt=""
            width={16}
            height={16}
            className="w-4 h-4 object-contain rounded"
          />{" "}
          <span className="font-semibold text-foreground">BettaPay</span>
        </div>

        {/* responsive footer */}
        <footer className="mt-6 text-center text-xs text-muted-foreground">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4 px-2">
            <div>Secure payments on Stellar</div>
            <div className="flex items-center gap-2">
              <button
                className="text-sm text-primary underline"
                onClick={() => setWalletModalOpen(true)}
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
