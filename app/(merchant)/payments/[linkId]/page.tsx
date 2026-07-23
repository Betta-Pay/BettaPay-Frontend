"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { QRCodeModal } from "@/components/payments/QRCode";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  MousePointerClick,
  Users,
  TrendingUp,
  DollarSign,
  Copy,
  QrCode,
  Trash2,
  CalendarDays,
  AlertTriangle,
  Download,
  RotateCcw,
  Globe,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { useNotify } from "@/lib/hooks/useNotify";
import Link from "next/link";
import { subDays, format } from "date-fns";

const ClicksChart = dynamic(
  () => import("@/components/charts/ClicksChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
  }
);

interface PaymentLinkDetail {
  id: string;
  label: string;
  url: string;
  type: "open" | "fixed";
  amount: number | null;
  currency: string;
  created: string;
  clicks: number;
  uniquePayers: number;
  totalRevenue: number;
  status: "active" | "deactivated";
}

interface PaymentAttempt {
  id: string;
  txHash: string | null;
  payer: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  timestamp: string;
  failureReason?: string;
}

interface WebhookLog {
  id: string;
  event: string;
  url: string;
  statusCode: number;
  timestamp: string;
  latencyMs: number;
}

const mockLinkDetails: Record<string, PaymentLinkDetail> = {
  link_01: {
    id: "link_01",
    label: "Consulting Retainer Q3",
    url: `${process.env.NEXT_PUBLIC_API_URL ?? 'https://betta.pay'}/pay/link_01`,
    type: "open",
    amount: null,
    currency: "USDC",
    created: "2026-07-20",
    clicks: 24,
    uniquePayers: 8,
    totalRevenue: 4500.0,
    status: "active",
  },
  link_02: {
    id: "link_02",
    label: "E-commerce Checkout",
    url: `${process.env.NEXT_PUBLIC_API_URL ?? 'https://betta.pay'}/pay/link_02`,
    type: "fixed",
    amount: 45.5,
    currency: "USDC",
    created: "2026-07-18",
    clicks: 112,
    uniquePayers: 47,
    totalRevenue: 5235.5,
    status: "active",
  },
  link_03: {
    id: "link_03",
    label: "Donation Campaign",
    url: `${process.env.NEXT_PUBLIC_API_URL ?? 'https://betta.pay'}/pay/link_03`,
    type: "open",
    amount: null,
    currency: "USDC",
    created: "2026-07-15",
    clicks: 58,
    uniquePayers: 19,
    totalRevenue: 2890.0,
    status: "active",
  },
};

function generatePaymentAttempts(linkId: string): PaymentAttempt[] {
  return [
    {
      id: `att_${linkId}_1`,
      txHash: "8f4a21...9b20",
      payer: "GA2C...8811",
      amount: 150.0,
      status: "completed",
      timestamp: subDays(new Date(), 0.1).toISOString(),
    },
    {
      id: `att_${linkId}_2`,
      txHash: null,
      payer: "GB99...4321",
      amount: 75.0,
      status: "failed",
      timestamp: subDays(new Date(), 0.5).toISOString(),
      failureReason: "Insufficient XLM for trustline fee balance",
    },
    {
      id: `att_${linkId}_3`,
      txHash: "3c12aa...77eb",
      payer: "GC44...1092",
      amount: 300.0,
      status: "completed",
      timestamp: subDays(new Date(), 1.2).toISOString(),
    },
    {
      id: `att_${linkId}_4`,
      txHash: null,
      payer: "GD11...5566",
      amount: 50.0,
      status: "failed",
      timestamp: subDays(new Date(), 2.0).toISOString(),
      failureReason: "User rejected Freighter wallet transaction signature",
    },
  ];
}

function generateWebhookLogs(linkId: string): WebhookLog[] {
  return [
    {
      id: `wh_${linkId}_101`,
      event: "payment.received",
      url: "https://merchant.example.com/api/webhooks/bettapay",
      statusCode: 200,
      timestamp: subDays(new Date(), 0.1).toISOString(),
      latencyMs: 142,
    },
    {
      id: `wh_${linkId}_102`,
      event: "payment.failed",
      url: "https://merchant.example.com/api/webhooks/bettapay",
      statusCode: 500,
      timestamp: subDays(new Date(), 0.5).toISOString(),
      latencyMs: 310,
    },
    {
      id: `wh_${linkId}_103`,
      event: "payment.received",
      url: "https://merchant.example.com/api/webhooks/bettapay",
      statusCode: 200,
      timestamp: subDays(new Date(), 1.2).toISOString(),
      latencyMs: 98,
    },
  ];
}

function generateClickTimeline(): { date: string; clicks: number }[] {
  return Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), "MMM d"),
    clicks: Math.floor(Math.random() * 15 + 1),
  }));
}

export default function PaymentLinkDetailPage() {
  const params = useParams();
  const notify = useNotify();
  const linkId = params.linkId as string;

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [isDeactivated, setIsDeactivated] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const linkDetails = useMemo(() => mockLinkDetails[linkId] ?? {
    id: linkId,
    label: `Payment Link (${linkId})`,
    url: `${process.env.NEXT_PUBLIC_API_URL ?? 'https://betta.pay'}/pay/${linkId}`,
    type: "fixed",
    amount: 100.0,
    currency: "USDC",
    created: "2026-07-22",
    clicks: 42,
    uniquePayers: 14,
    totalRevenue: 1400.0,
    status: "active",
  }, [linkId]);

  const attempts = generatePaymentAttempts(linkId);
  const webhooks = generateWebhookLogs(linkId);
  const clickTimeline = generateClickTimeline();

  const conversionRate = linkDetails
    ? Math.round((linkDetails.uniquePayers / linkDetails.clicks) * 100)
    : 0;

  const handleCopyLink = useCallback(() => {
    if (!linkDetails) return;
    navigator.clipboard.writeText(linkDetails.url);
    notify.success("Link copied to clipboard");
  }, [linkDetails, notify]);

  const handleDeactivate = useCallback(() => {
    setIsDeactivated(true);
    setDeactivateOpen(false);
    notify.success("Payment link deactivated");
  }, [notify]);

  const handleRetryAttempt = (attemptId: string) => {
    notify.info(`Triggered retry for attempt ${attemptId}`);
  };

  const handleRetryWebhook = (webhookId: string) => {
    notify.success(`Re-sent webhook payload for ${webhookId}`);
  };

  const kpiCards = [
    {
      label: "Total Clicks",
      value: linkDetails.clicks.toLocaleString(),
      icon: MousePointerClick,
      gradient: "from-amber-50/60 to-transparent",
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
    },
    {
      label: "Unique Payers",
      value: linkDetails.uniquePayers.toLocaleString(),
      icon: Users,
      gradient: "from-blue-50/60 to-transparent",
      iconBg: "bg-info/20",
      iconColor: "text-info",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      gradient: "from-emerald-50/60 to-transparent",
      iconBg: "bg-success/20",
      iconColor: "text-success",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(linkDetails.totalRevenue),
      icon: DollarSign,
      gradient: "from-purple-50/60 to-transparent",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link
            href="/payments"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Payment Links
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {linkDetails.label}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{linkDetails.url}</span>
            <span className="text-muted-foreground/50">·</span>
            <span>Created {linkDetails.created}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              isDeactivated
                ? "bg-destructive/10 text-destructive"
                : "bg-success/20 text-success dark:bg-success/10 dark:text-emerald-400"
            )}>
              {isDeactivated ? "Deactivated" : "Active"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br pointer-events-none",
                  card.gradient
                )}
              />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </CardTitle>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    card.iconBg
                  )}
                >
                  <Icon className={cn("h-4 w-4", card.iconColor)} />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 relative">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Click Timeline
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daily interactions over the last 30 days
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5" />
                Last 30 days
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ClicksChart data={clickTimeline} height={260} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">
                Management
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Share Link
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 border border-border">
                  <p className="text-xs font-mono text-foreground truncate">
                    {linkDetails.url}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                  aria-label="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                QR Code
              </p>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setQrOpen(true)}
              >
                <QrCode className="w-4 h-4" />
                Show QR Code
              </Button>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Danger Zone
              </p>
              <Button
                variant="destructive"
                className="w-full justify-start gap-2"
                disabled={isDeactivated}
                onClick={() => setDeactivateOpen(true)}
              >
                <Trash2 className="w-4 h-4" />
                {isDeactivated ? "Deactivated" : "Deactivate Link"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Attempts Timeline Section */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Payment Attempts Timeline
              </CardTitle>
              <CardDescription>Full audit trail of customer payment submissions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer</TableHead>
                <TableHead>Tx Hash</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status / Details</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((att) => (
                <TableRow key={att.id}>
                  <TableCell className="font-mono text-xs font-medium">{att.payer}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{att.txHash ?? '—'}</TableCell>
                  <TableCell className="font-semibold"><CurrencyDisplay amount={att.amount} /></TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge status={att.status} />
                      {att.failureReason && (
                        <span className="text-[10px] text-destructive max-w-[200px] truncate" title={att.failureReason}>
                          {att.failureReason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(att.timestamp)}</TableCell>
                  <TableCell className="text-right">
                    {att.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => handleRetryAttempt(att.id)}
                      >
                        <RotateCcw className="w-3 h-3 text-primary" /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Webhook Delivery Logs Section */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-info" /> Webhook Delivery Logs
              </CardTitle>
              <CardDescription>Real-time delivery status to your endpoint</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Endpoint URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Re-send</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-mono text-xs font-semibold">{wh.event}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{wh.url}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-mono font-bold",
                      wh.statusCode === 200 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      HTTP {wh.statusCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{wh.latencyMs} ms</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(wh.timestamp)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1"
                      onClick={() => handleRetryWebhook(wh.id)}
                    >
                      <RotateCcw className="w-3 h-3 text-muted-foreground" /> Ping
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Deactivate Payment Link
            </DialogTitle>
            <DialogDescription>
              This will permanently disable &ldquo;{linkDetails.label}&rdquo;.
              No new payments can be made through this link.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive">
                  This action cannot be undone
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  Existing payment links to this URL will stop working immediately.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDeactivateOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              className="flex-1"
            >
              Yes, Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QRCodeModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        value={linkDetails.url}
        title={linkDetails.label}
        amountUsdc={linkDetails.amount}
      />
    </div>
  );
}
