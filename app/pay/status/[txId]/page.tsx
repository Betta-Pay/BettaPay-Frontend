"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Check, X, Loader2, ExternalLink, ArrowLeft, RefreshCw } from 'lucide-react';
import { CurrencyDisplay } from '@/components/shared';
import { truncateAddress } from '@/lib/utils/format';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { normalizePaymentStatus, PAYMENT_STATUS } from '@/lib/utils/constants';
import { apiClient } from '@/lib/api/axios';

type Status = 'processing' | 'success' | 'failed' | 'timeout';

/**
 * Fields of the payment status payload this page actually relies on.
 *
 * `GET /api/payments/:id` is documented with `amountUsdc` in the frontend
 * contract while the gateway returns the raw payment row, which names the
 * field `amount`; both are read. There is deliberately no merchant display
 * name here: the status payload only carries `merchantId`, and the only
 * endpoint exposing `Merchant.name` is authenticated and owner-scoped, so a
 * payer-facing page must not render a name it cannot verify.
 */
interface PaymentStatusPayload {
  status?: unknown;
  amount?: unknown;
  amountUsdc?: unknown;
  asset?: unknown;
  txHash?: unknown;
}

// ─── Polling config ───────────────────────────────────────────────────────────
// Base interval: 3 s. Backoff multiplier: 1.5×. Cap: 30 s.
// 60 attempts ≈ 3 minutes of total wall-clock time before giving up.
const POLL_BASE_MS = 3_000;
const POLL_BACKOFF = 1.5;
const POLL_CAP_MS = 30_000;
const POLL_MAX_ATTEMPTS = 60;

function nextDelay(attempt: number): number {
  const raw = POLL_BASE_MS * Math.pow(POLL_BACKOFF, attempt);
  return Math.min(raw, POLL_CAP_MS);
}

/**
 * The API answers with a `{ data: payment }` envelope, but older callers and
 * tests use a flat payment object. Support both rather than guessing.
 */
function unwrapPaymentPayload(body: unknown): PaymentStatusPayload | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const candidate =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;
  return candidate as PaymentStatusPayload;
}

/**
 * Map the backend's payment vocabulary (initiated | completed | failed |
 * cancelled, plus legacy `success`) onto this page's terminal states. Every
 * other value keeps the page polling, as before.
 */
function resolveTerminalStatus(raw: unknown): 'success' | 'failed' | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const lower = raw.toLowerCase().trim();
  // The backend's terminal failure statuses; `cancelled` is not part of the
  // canonical frontend vocabulary, so map it here.
  if (lower === 'cancelled' || lower === 'canceled') return 'failed';
  const normalized = normalizePaymentStatus(lower);
  if (normalized === PAYMENT_STATUS.COMPLETED) return 'success';
  if (normalized === PAYMENT_STATUS.FAILED) return 'failed';
  return null;
}

/** Numeric amount from whichever documented field carries it, else null. */
function readAmount(payment: PaymentStatusPayload): number | null {
  const raw = payment.amount ?? payment.amountUsdc;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** A hash is only usable when the payload actually carries a non-empty one. */
function readTxHash(payment: PaymentStatusPayload): string | null {
  if (typeof payment.txHash !== 'string') return null;
  const hash = payment.txHash.trim();
  return hash === '' ? null : hash;
}

export default function PaymentStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const txId = (params?.txId as string) ?? '';
  const initialStatus = (searchParams?.get('status') as Status) || 'processing';

  const [status, setStatus] = useState<Status>(initialStatus);
  const [paymentData, setPaymentData] = useState<PaymentStatusPayload | null>(null);

  // Refs so the polling closure always sees the latest values without
  // needing to be re-created (avoids re-registering the effect).
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  // Incremented on every (re)start and on unmount. An in-flight request or a
  // queued timer from an older run can never schedule work for the current one.
  const runIdRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const isCurrentRun = useCallback(
    (runId: number) => mountedRef.current && runId === runIdRef.current,
    [],
  );

  const checkStatus = useCallback(
    async (runId: number) => {
      if (!isCurrentRun(runId)) return;

      try {
        const response = await apiClient.get(`/api/payments/${txId}`);

        // A restart or unmount may have happened while the request was in
        // flight; discard the result instead of scheduling another loop.
        if (!isCurrentRun(runId)) return;

        const payment = unwrapPaymentPayload(response?.data);

        if (payment) {
          setPaymentData(payment);

          const terminal = resolveTerminalStatus(payment.status);
          if (terminal) {
            clearTimer();
            setStatus(terminal);
            return; // terminal — stop polling
          }
        }
      } catch (err) {
        // A restart or unmount may have happened while the request was in
        // flight; discard the failure without logging it.
        if (!isCurrentRun(runId)) return;

        // Network / 5xx error — do NOT silently swallow and reschedule forever.
        // The attempt counter still advances so backoff and the retry cap apply.
        console.error('Failed to fetch payment status', err);
      }

      if (!isCurrentRun(runId)) return;

      attemptRef.current += 1;

      if (attemptRef.current >= POLL_MAX_ATTEMPTS) {
        clearTimer();
        setStatus('timeout');
        return;
      }

      const delay = nextDelay(attemptRef.current);
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void checkStatus(runId);
      }, delay);
    },
    [txId, clearTimer, isCurrentRun],
  );

  /**
   * Single entry point for starting the poll loop: cancels whatever is
   * pending, invalidates older runs, and tracks the zero-delay kickoff so a
   * restart cannot stack a second loop on top of the first.
   */
  const startPolling = useCallback(() => {
    runIdRef.current += 1;
    const runId = runIdRef.current;

    clearTimer();
    attemptRef.current = 0;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void checkStatus(runId);
    }, 0);
  }, [checkStatus, clearTimer]);

  useEffect(() => {
    mountedRef.current = true;

    if (status === 'processing') {
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      clearTimer();
    };
    // startPolling is stable (useCallback over checkStatus, which is keyed on
    // [txId]); status intentionally omitted — we only want to (re-)start the
    // loop when the parent renders this effect for the first time or when txId
    // changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

  // Allow the "Try Again" and manual-refresh buttons to restart polling cleanly.
  const restartPolling = useCallback(() => {
    if (!mountedRef.current) return;
    // Drop the previous attempt's amount/hash so a stale value cannot flash
    // while the new poll is in flight.
    setPaymentData(null);
    setStatus('processing');
    startPolling();
  }, [startPolling]);

  const amount = paymentData ? readAmount(paymentData) : null;
  const currency =
    paymentData && typeof paymentData.asset === 'string' && paymentData.asset.trim() !== ''
      ? paymentData.asset
      : undefined;
  const txHash = paymentData ? readTxHash(paymentData) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {status === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center space-y-6 text-center"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center shadow-lg">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Confirming Payment</h2>
                <p className="text-muted-foreground mt-2">
                  Waiting for Stellar network confirmation...
                </p>
              </div>
            </motion.div>
          )}

          {status === 'timeout' && (
            <motion.div
              key="timeout"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full"
            >
              <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <div className="h-2 bg-warning w-full" />
                <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-warning/10 border-2 border-warning flex items-center justify-center">
                    <RefreshCw className="w-10 h-10 text-warning" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold">Still Confirming</h2>
                    <p className="text-muted-foreground mt-1">
                      The network is taking longer than expected. Your payment
                      may still go through — check back in a few minutes.
                    </p>
                  </div>

                  <div className="w-full bg-transparent rounded-lg p-4 space-y-3 text-sm border border-border text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono">{truncateAddress(txId)}</span>
                    </div>
                  </div>

                  <div className="w-full flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.back()}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button className="flex-1" onClick={restartPolling}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Check Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <div className="h-2 bg-success w-full" />
                <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
                    className="w-20 h-20 rounded-full bg-success/10 border-2 border-success flex items-center justify-center"
                  >
                    <Check className="w-10 h-10 text-success" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold">Payment Successful</h2>
                  </div>

                  <div className="text-4xl font-bold text-foreground">
                    <CurrencyDisplay amount={amount} currency={currency} />
                  </div>

                  <div className="w-full bg-transparent rounded-lg p-4 space-y-3 text-sm border border-border text-left">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID</span>
                      <span className="font-mono">{truncateAddress(txId)}</span>
                    </div>
                    {txHash && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Network Hash</span>
                        <a
                          href={getStellarExplorerTxUrl(txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary hover:underline flex items-center gap-1"
                        >
                          {truncateAddress(txHash)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full h-12"
                    onClick={() => router.push('/')}
                  >
                    Return to Merchant
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <div className="h-2 bg-destructive w-full" />
                <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive flex items-center justify-center"
                  >
                    <X className="w-10 h-10 text-destructive" />
                  </motion.div>

                  <div>
                    <h2 className="text-2xl font-bold">Payment Failed</h2>
                    <p className="text-muted-foreground mt-1">
                      The transaction was rejected by the network.
                    </p>
                  </div>

                  <div className="w-full flex gap-3 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.back()}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button className="flex-1" onClick={restartPolling}>
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
