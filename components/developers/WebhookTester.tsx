"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { Badge } from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import {
  Zap,
  Send,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuthStore } from "@/lib/store/authStore";
import { useOfflineStore } from "@/lib/store/offlineStore";
import {
  enqueueSyncRequest,
  watchSyncComplete,
  SYNC_TAGS,
  type SyncCompleteMessage,
} from "@/lib/offline/syncQueue";

const EVENT_TYPES = [
  { value: "payment.completed", label: "payment.completed" },
  { value: "settlement.completed", label: "settlement.completed" },
  { value: "dispute.created", label: "dispute.created" },
] as const;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const SAMPLE_PAYLOADS: Record<string, JsonValue> = {
  "payment.completed": {
    id: "evt_pay_123456",
    type: "payment.completed",
    data: {
      payment_id: "pay_987654",
      amount: 5000,
      currency: "USDC",
      status: "completed",
      customer: { email: "customer@example.com" },
    },
    created_at: new Date().toISOString(),
  },
  "settlement.completed": {
    id: "evt_set_234567",
    type: "settlement.completed",
    data: {
      settlement_id: "set_112233",
      amount: 4900,
      currency: "USDC",
      fee: 100,
      status: "processed",
    },
    created_at: new Date().toISOString(),
  },
  "dispute.created": {
    id: "evt_disp_345678",
    type: "dispute.created",
    data: {
      dispute_id: "disp_998877",
      payment_id: "pay_987654",
      amount: 5000,
      currency: "USDC",
      reason: "fraudulent",
      status: "pending_review",
    },
    created_at: new Date().toISOString(),
  },
};

interface DeliveryLogEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  targetUrl: string;
  status: "success" | "failed" | "pending";
  statusCode: number;
  resultType?: string;
  /** Queue id when the attempt was background-synced while offline. */
  syncId?: string;
}

async function computeHmacSignature(secret: string, payloadStr: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await window.crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payloadStr)
      );
      const hex = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `sha256=${hex}`;
    } catch {
      // Fallback below
    }
  }

  try {
    const cryptoModule = await import("crypto");
    const hex = cryptoModule.createHmac("sha256", secret).update(payloadStr).digest("hex");
    return `sha256=${hex}`;
  } catch {
    return "";
  }
}

interface WebhookTesterProps {
  initialEndpointUrl?: string;
  initialWebhookSecret?: string;
}

export function WebhookTester({
  initialEndpointUrl = "https://your-app.com/webhooks/bettapay",
  initialWebhookSecret = "whsec_test_secret123",
}: WebhookTesterProps = {}) {
  const { user } = useAuthStore();
  const [endpointUrl, setEndpointUrl] = useState(initialEndpointUrl);
  const [webhookSecret, setWebhookSecret] = useState(initialWebhookSecret);
  const [selectedEvent, setSelectedEvent] = useState<string>("payment.completed");
  const [targetUrl, setTargetUrl] = useState<string>(() => {
    if (initialEndpointUrl) return initialEndpointUrl;
    if (typeof window !== "undefined") {
      try {
        const draft = localStorage.getItem("onboardingDraft");
        if (draft) {
          const parsed = JSON.parse(draft);
          if (parsed.data?.webhookUrl) return parsed.data.webhookUrl;
        }
      } catch {
        // Fallback below
      }
    }
    return user?.id ? `https://api.bettapay.io/merchants/${user.id}/webhooks` : "https://api.bettapay.io/webhooks/merchant_01";
  });
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    isTimeout?: boolean;
    headers: Record<string, string>;
    body: JsonValue;
  } | null>(null);
  const [deliveryLog, setDeliveryLog] = useState<DeliveryLogEntry[]>([]);
  const [signaturePayload, setSignaturePayload] = useState("");
  const [signatureSecret, setSignatureSecret] = useState("");
  const [signatureResult, setSignatureResult] = useState<{
    valid: boolean;
    computedSignature?: string;
    expectedSignature?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const notify = useNotify();

  const handleSend = useCallback(async () => {
    if (!endpointUrl.trim()) {
      notify.error("Please enter a valid webhook endpoint URL");
      return;
    }

    setIsSending(true);
    setResponse(null);

    const payload = SAMPLE_PAYLOADS[selectedEvent];
    const bodyString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const eventId = (payload as { id?: string })?.id || `evt_${Date.now()}`;
    // Computed before the try so the offline catch can replay the exact
    // signed request via background sync. Never throws (falls back to "").
    const signature = await computeHmacSignature(webhookSecret, bodyString);

    try {
      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-BettaPay-Signature": signature,
          "X-BettaPay-Timestamp": timestamp,
          "X-BettaPay-Event-Id": eventId,
        },
        body: bodyString,
      });

      const responseStatusCode = res.status;
      const responseHeaders: Record<string, string> = {};

      if (res.headers && typeof res.headers.forEach === "function") {
        res.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });
      }

      let responseBody: JsonValue;
      const contentType = res.headers?.get("content-type") || "";
      const responseText = await res.text();

      if (contentType.includes("application/json")) {
        try {
          responseBody = JSON.parse(responseText);
        } catch {
          responseBody = responseText;
        }
      } else {
        responseBody = responseText || responseStatusCode;
      }

      setResponse({
        status: responseStatusCode,
        statusText: res.statusText || (responseStatusCode >= 200 && responseStatusCode < 300 ? 'OK' : 'Error'),
        headers: responseHeaders,
        body: responseBody,
      });

      const isSuccess = responseStatusCode >= 200 && responseStatusCode < 300;
      setDeliveryLog((prev) => [
        {
          id: `del_${Date.now()}`,
          timestamp: new Date(),
          eventType: selectedEvent,
          targetUrl: endpointUrl,
          status: isSuccess ? "success" : "failed",
          statusCode: responseStatusCode,
        },
        ...prev,
      ]);

      if (isSuccess) {
        notify.success(`Test webhook sent successfully (${responseStatusCode})`);
      } else {
        notify.error(`Webhook endpoint returned status ${responseStatusCode}`);
      }
    } catch (err: unknown) {
      const { isOnline, isApiReachable } = useOfflineStore.getState();
      if (!isOnline || !isApiReachable) {
        // Offline / API unreachable: queue the test for background sync so it
        // is sent automatically when connectivity returns.
        const headers: Array<[string, string]> = [
          ["Content-Type", "application/json"],
          ["X-BettaPay-Signature", signature],
          ["X-BettaPay-Timestamp", timestamp],
          ["X-BettaPay-Event-Id", eventId],
        ];
        try {
          const syncId = await enqueueSyncRequest({
            tag: SYNC_TAGS.webhookTest,
            url: endpointUrl,
            method: "POST",
            headers,
            body: bodyString,
          });
          setDeliveryLog((prev) => [
            {
              id: `del_${Date.now()}`,
              timestamp: new Date(),
              eventType: selectedEvent,
              targetUrl: endpointUrl,
              status: "pending",
              statusCode: 0,
              syncId,
            },
            ...prev,
          ]);
          notify.info("Webhook test queued — it will be sent automatically when you're back online.");
          return;
        } catch {
          // Fall through to the generic network error below.
        }
      }
      const errorMsg = err instanceof Error ? err.message : "Failed to deliver webhook";
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: {
          error: errorMsg,
          message: "Could not connect to webhook endpoint. Check URL accessibility or CORS policy.",
        },
      });
      setDeliveryLog((prev) => [
        {
          id: `del_${Date.now()}`,
          timestamp: new Date(),
          eventType: selectedEvent,
          targetUrl: endpointUrl,
          status: "failed",
          statusCode: 0,
        },
        ...prev,
      ]);
      notify.error(`Webhook request failed: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  }, [endpointUrl, webhookSecret, selectedEvent, notify]);

  // When a background-synced test is replayed, flip its pending log entry to
  // delivered/failed so the delivery history reflects the actual outcome.
  useEffect(() => {
    return watchSyncComplete((message: SyncCompleteMessage) => {
      if (message.tag !== SYNC_TAGS.webhookTest) return;
      setDeliveryLog((prev) =>
        prev.map((entry) =>
          entry.syncId === message.id
            ? {
                ...entry,
                status: message.ok ? "success" : "failed",
                statusCode: message.ok ? 200 : 0,
                resultType: message.ok ? "background sync" : "sync failed",
                syncId: undefined,
              }
            : entry,
        ),
      );
      if (message.ok) {
        notify.success("Queued webhook test delivered (background sync)");
      } else {
        notify.error("Queued webhook test could not be delivered (background sync)");
      }
    });
  }, [notify]);

  const handleCopyPayload = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2));
    notify.success("Payload copied to clipboard");
  }, [selectedEvent, notify]);

  const handleVerifySignature = useCallback(async () => {
    if (!signaturePayload.trim() || !signatureSecret.trim()) {
      notify.error("Please provide both the payload and the signing secret");
      return;
    }

    setIsVerifying(true);
    setSignatureResult(null);

    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(signatureSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(signaturePayload));
      const computedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const payloadLines = signaturePayload.split("\n");
      const signatureLine = payloadLines.find((l) => l.includes("x-signature"));
      const expectedSignature = signatureLine
        ? signatureLine.split(":")[1]?.trim()
        : null;

      const isValid = expectedSignature
        ? computedSignature === expectedSignature
        : false;

      setSignatureResult({
        valid: isValid,
        computedSignature,
        expectedSignature: expectedSignature || undefined,
      });
    } catch {
      setSignatureResult({ valid: false });
      notify.error("Failed to verify signature");
    } finally {
      setIsVerifying(false);
    }
  }, [signaturePayload, signatureSecret, notify]);

  return (
    <div className="space-y-6">
      {/* Test Event Sender */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" /> Send Test Event
          </CardTitle>
          <CardDescription>
            Simulate a webhook event to verify your endpoint handles it correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Webhook Endpoint URL</Label>
              <Input
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://your-app.com/webhooks/bettapay"
                className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <Input
                type="password"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Event Type</Label>
              <Select value={selectedEvent} onValueChange={(v) => v && setSelectedEvent(v)}>
                <SelectTrigger className="w-full h-10 border-border rounded-xl bg-muted">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="bg-foreground hover:bg-foreground/90 text-background rounded-xl h-10 px-6 text-sm font-semibold min-w-[140px]"
            >
              {isSending ? (
                <><RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Zap className="w-3.5 h-3.5 mr-2" /> Send Test Event</>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Payload</Label>
              <Button variant="ghost" size="sm" className="min-h-[36px] text-xs" onClick={handleCopyPayload}>
                <Copy className="w-3 h-3 mr-1" /> Copy
              </Button>
            </div>
            <div className="bg-foreground rounded-xl p-4 overflow-x-auto border border-border">
              <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                {JSON.stringify(SAMPLE_PAYLOADS[selectedEvent], null, 2)}
              </pre>
            </div>
          </div>

          {response && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                {response.status >= 200 && response.status < 300 ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                <span className="text-sm font-semibold">
                  Response: {response.status === 0 ? "0 (Network Error)" : `${response.status} ${response.status === 200 ? "OK" : ""}`}
                </span>
                {response.isTimeout && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    Timeout
                  </Badge>
                )}
                {!response.isTimeout && response.status !== 200 && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    HTTP Error
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Headers</p>
                <div className="bg-background rounded-lg p-3 border border-border">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="text-xs font-mono text-foreground">
                      <span className="text-muted-foreground">{key}: </span>{value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Body</p>
                <div className="bg-background rounded-lg p-3 border border-border overflow-x-auto">
                  <pre className="text-xs font-mono text-foreground">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery History */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Delivery History
          </CardTitle>
          <CardDescription>Recent webhook test delivery attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveryLog.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No deliveries yet. Send a test event above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Target Endpoint</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP Status / Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">
                      {entry.timestamp.toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={entry.targetUrl}>
                      {entry.targetUrl}
                    </TableCell>
                    <TableCell className="font-medium">{entry.eventType}</TableCell>
                    <TableCell>
                      {entry.status === "pending" ? (
                        <Badge variant="outline" className="text-warning border-warning/40">
                          Queued (offline)
                        </Badge>
                      ) : (
                        <Badge
                          variant={entry.status === "success" ? "outline" : "destructive"}
                          className={entry.status === "success" ? "text-success border-success/30" : undefined}
                        >
                          {entry.status === "success" ? "Delivered" : "Failed"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.statusCode} {entry.resultType && `(${entry.resultType})`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Signature Verification Helper */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Signature Verification
          </CardTitle>
          <CardDescription>
            Paste a webhook payload and your signing secret to test HMAC-SHA256 signature verification locally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Payload</Label>
            <textarea
              value={signaturePayload}
              onChange={(e) => setSignaturePayload(e.target.value)}
              placeholder='{"id":"evt_123","type":"payment.completed",...}'
              rows={5}
              className="w-full rounded-xl border border-border bg-muted p-3 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Signing Secret</Label>
            <Input
              value={signatureSecret}
              onChange={(e) => setSignatureSecret(e.target.value)}
              placeholder="whsec_..."
              className="h-10 border-border rounded-xl bg-muted font-mono text-sm"
            />
          </div>
          <Button
            onClick={handleVerifySignature}
            disabled={isVerifying}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-6 text-sm font-semibold"
          >
            {isVerifying ? (
              <><RefreshCcw className="w-3.5 h-3.5 mr-2 animate-spin" /> Verifying...</>
            ) : (
              <><ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verify Signature</>
            )}
          </Button>

          {signatureResult && (
            <div
              className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                signatureResult.valid
                  ? "bg-success/10 border-success/20"
                  : "bg-destructive/10 border-destructive/20"
              )}
            >
              {signatureResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-sm">
                <p className={cn("font-semibold", signatureResult.valid ? "text-success" : "text-destructive")}>
                  {signatureResult.valid ? "Signature Verified" : "Signature Mismatch"}
                </p>
                {signatureResult.computedSignature && (
                  <div className="text-xs font-mono text-muted-foreground">
                    <p>Computed: {signatureResult.computedSignature.slice(0, 32)}...</p>
                  </div>
                )}
                {signatureResult.expectedSignature && (
                  <div className="text-xs font-mono text-muted-foreground">
                    <p>Expected: {signatureResult.expectedSignature.slice(0, 32)}...</p>
                  </div>
                )}
                {!signatureResult.expectedSignature && (
                  <p className="text-xs text-muted-foreground">
                    Tip: Include an <code className="text-xs bg-muted px-1 rounded">x-signature</code> header line in your payload for comparison.
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
