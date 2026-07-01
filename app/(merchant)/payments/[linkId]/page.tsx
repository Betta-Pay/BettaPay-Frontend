"use client";

import { useState, useCallback } from "react";
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
  Link2,
  CalendarDays,
  AlertTriangle,
  ChevronLeft,
  Download,
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

interface PaymentRecord {
  id: string;
  payer: string;
  amount: number;
  amountNgn: number;
  status: string;
  date: string;
}

const mockLinkDetails: Record<string, PaymentLinkDetail> = {
  link_01: {
    id: "link_01",
    label: "Consulting Retainer Q3",
    url: "https://betta.pay/pay/link_01",
    type: "open",
    amount: null,
    currency: "USDC",
    created: "2023-10-25",
    clicks: 24,
    uniquePayers: 8,
    totalRevenue: 4500.0,
    status: "active",
  },
  link_02: {
    id: "link_02",
    label: "E-commerce Checkout",
    url: "https://betta.pay/pay/link_02",
    type: "fixed",
    amount: 45.5,
    currency: "USDC",
    created: "2023-10-24",
    clicks: 112,
    uniquePayers: 47,
    totalRevenue: 5235.5,
    status: "active",
  },
  link_03: {
    id: "link_03",
    label: "Donation Campaign",
    url: "https://betta.pay/pay/link_03",
    type: "open",
    amount: null,
    currency: "USDC",
    created: "2023-10-20",
    clicks: 58,
    uniquePayers: 19,
    totalRevenue: 2890.0,
    status: "active",
  },
};

function generateMockPayments(linkId: string): PaymentRecord[] {
  const baseCount = linkId === "link_02" ? 47 : linkId === "link_03" ? 19 : 8;
  return Array.from({ length: Math.min(baseCount, 10) }, (_, i) => ({
    id: `pay_${linkId}_${i}`,
    payer: `G${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 3) % 26))}...${(1000 + i).toString().slice(-3)}`,
    amount: Math.round((Math.random() * 500 + 20) * 100) / 100,
    amountNgn: Math.round(Math.random() * 775000 + 31000),
    status: ["success", "success", "success", "pending", "success"][i % 5],
    date: subDays(new Date(), i * 2).toISOString(),
  }));
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

  const linkDetails = mockLinkDetails[linkId];
  const payments = generateMockPayments(linkId);
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

  const handleDownloadQR = useCallback(() => {
    setQrOpen(true);
  }, []);

  if (!linkDetails) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Link2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Payment link not found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The payment link you are looking for does not exist or has been removed.
          </p>
          <Link href="/payments">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
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
                onClick={handleDownloadQR}
              >
                <QrCode className="w-4 h-4" />
                Download QR Code
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

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Recent Settlements
          </CardTitle>
          <CardDescription>
            Payments processed through this link
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>NGN Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No payments yet for this link.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs">
                      {payment.payer}
                    </TableCell>
                    <TableCell className="font-semibold">
                      <CurrencyDisplay amount={payment.amount} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      ₦{payment.amountNgn.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(payment.date)}
                    </TableCell>
                  </TableRow>
                ))
              )}
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
            <div className="flex items-start gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/10 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive dark:text-red-300">
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

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-xs bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code</DialogTitle>
            <DialogDescription className="text-center">
              Scan to open payment link
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 space-y-4">
            <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center border border-border">
              <QrCode className="w-32 h-32 text-foreground/80" />
            </div>
            <p className="text-xs text-muted-foreground text-center font-mono max-w-full truncate">
              {linkDetails.url}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                notify.success("QR code downloaded");
                setQrOpen(false);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


