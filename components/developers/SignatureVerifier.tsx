"use client";

import { useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import {
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  signPayload,
  verifyWebhookSignature,
  type WebhookSignatureVerification,
} from "@/lib/webhooks/hmac";
import { AlertCircle, CheckCircle2, Play, ShieldCheck, ShieldX, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SECRET = "whsec_test_secret123";

function currentTimestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

function samplePayload(): string {
  return JSON.stringify(
    {
      id: "evt_pay_123456",
      type: "payment.completed",
      createdAt: new Date().toISOString(),
      data: {
        paymentId: "pay_987654",
        amountUsdc: 25.0,
        currency: "USDC",
        status: "completed",
      },
    },
    null,
    2,
  );
}

function tamperPayload(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      data?: { amountUsdc?: number };
    };
    if (parsed.data && typeof parsed.data.amountUsdc === "number") {
      parsed.data.amountUsdc = 2500.0;
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Non-JSON payloads are valid HMAC inputs; fall back to a byte change.
  }
  return `${payload} `;
}

/**
 * Client-side webhook signature demo. Everything — the HMAC computation,
 * comparison and sample generation — happens in the browser; the secret is
 * never sent to BettaPay.
 */
export function SignatureVerifier() {
  const notify = useNotify();
  const [secret, setSecret] = useState(DEFAULT_SECRET);
  const [timestamp, setTimestamp] = useState(currentTimestamp);
  const [payload, setPayload] = useState(samplePayload);
  const [signature, setSignature] = useState("");
  const [result, setResult] = useState<WebhookSignatureVerification | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = useCallback(
    async (input?: {
      secret?: string;
      timestamp?: string;
      payload?: string;
      signature?: string;
    }) => {
      setIsVerifying(true);
      try {
        const next = await verifyWebhookSignature({
          secret: input?.secret ?? secret,
          timestamp: input?.timestamp ?? timestamp,
          payload: input?.payload ?? payload,
          signature: input?.signature ?? signature,
        });
        setResult(next);
        if (next.valid) {
          notify.success("Signature verified");
        } else {
          notify.error(next.reason ?? "Signature verification failed");
        }
        return next;
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to compute the signature in this browser";
        notify.error(message);
        setResult(null);
        return null;
      } finally {
        setIsVerifying(false);
      }
    },
    [notify, payload, secret, signature, timestamp],
  );

  const simulate = useCallback(
    async (tampered: boolean) => {
      const nextTimestamp = currentTimestamp();
      const signedPayload = samplePayload();
      // Sign the original body, then show the tampered body. This is what a
      // real attacker changing the payload in flight would look like.
      const nextPayload = tampered ? tamperPayload(signedPayload) : signedPayload;
      const nextSignature = `sha256=${await signPayload(
        DEFAULT_SECRET,
        nextTimestamp,
        signedPayload,
      )}`;

      setSecret(DEFAULT_SECRET);
      setTimestamp(nextTimestamp);
      setPayload(nextPayload);
      setSignature(nextSignature);

      const nextResult = await verifyWebhookSignature({
        secret: DEFAULT_SECRET,
        timestamp: nextTimestamp,
        payload: nextPayload,
        signature: nextSignature,
      });
      setResult(nextResult);
      notify[nextResult.valid ? "success" : "error"](
        nextResult.valid
          ? "Signed sample generated — signature matches"
          : "Tampered sample generated — signature mismatch",
      );
    },
    [notify],
  );

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Verify a webhook signature
        </CardTitle>
        <CardDescription>
          Paste a delivery&apos;s raw payload, timestamp and{" "}
          <code className="text-xs">{SIGNATURE_HEADER}</code> header to recompute the
          HMAC-SHA256 locally. The canonical signed string is{" "}
          <code className="text-xs">{"`${timestamp}.${rawBody}`"}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="signature-secret">Signing secret</Label>
            <Input
              id="signature-secret"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="whsec_..."
              autoComplete="off"
              spellCheck={false}
              className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signature-timestamp">Timestamp</Label>
            <Input
              id="signature-timestamp"
              value={timestamp}
              onChange={(event) => setTimestamp(event.target.value)}
              placeholder="1700000000"
              inputMode="numeric"
              className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature-payload">Raw payload</Label>
          <textarea
            id="signature-payload"
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-muted p-3 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground">
            The payload is signed as raw bytes. Empty or malformed JSON is still a valid
            HMAC input — use exactly what your endpoint received.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature-header">{SIGNATURE_HEADER} header</Label>
          <Input
            id="signature-header"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder="sha256=..."
            autoComplete="off"
            spellCheck={false}
            className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void verify()}
            disabled={isVerifying}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-5 text-sm font-semibold"
          >
            {isVerifying ? (
              <>
                <Zap className="w-3.5 h-3.5 mr-2 animate-pulse" /> Verifying...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-2" /> Verify signature
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => void simulate(false)}
            className="rounded-xl h-10 px-4 text-sm"
          >
            <Zap className="w-3.5 h-3.5 mr-2" /> Simulate signed webhook
          </Button>
          <Button
            variant="outline"
            onClick={() => void simulate(true)}
            className="rounded-xl h-10 px-4 text-sm"
          >
            <ShieldX className="w-3.5 h-3.5 mr-2" /> Simulate tampered payload
          </Button>
        </div>

        {result && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "space-y-3 rounded-xl border p-4",
              result.valid
                ? "border-success/30 bg-success/10"
                : "border-destructive/30 bg-destructive/10",
            )}
          >
            <div className="flex items-start gap-2">
              {result.valid ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-destructive" />
              )}
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    result.valid ? "text-success" : "text-destructive",
                  )}
                >
                  {result.valid ? "Signature verified" : "Signature mismatch"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.valid
                    ? "The signature matches the timestamp and raw payload."
                    : result.reason}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Canonical signed string
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground">
                {result.canonical}
              </pre>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Computed
                </p>
                <code className="block break-all rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground">
                  {result.computedSignature}
                </code>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Provided
                </p>
                <code className="block break-all rounded-lg border border-border bg-background p-3 font-mono text-xs text-foreground">
                  {result.providedSignature || "(missing)"}
                </code>
              </div>
            </div>

            {!result.valid && result.firstMismatchIndex !== null && (
              <p className="text-xs text-muted-foreground">
                First differing character:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                  {result.firstMismatchIndex}
                </code>{" "}
                (0-indexed, excluding the <code className="text-xs">sha256=</code> prefix).
              </p>
            )}

            {result.valid && (
              <p className="text-xs text-muted-foreground">
                Headers to expect:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                  {TIMESTAMP_HEADER}: {timestamp}
                </code>{" "}
                and{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                  {SIGNATURE_HEADER}: {result.computedSignature}
                </code>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
