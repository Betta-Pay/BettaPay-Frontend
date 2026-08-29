"use client";

/**
 * /merchants/kyb — KYB Review Queue
 *
 * Lists merchants whose kybStatus is 'pending' or 'unverified'.
 * Selecting a row opens the KybReviewPane side panel.
 * Approving / rejecting updates the row optimistically without a full reload.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  Skeleton,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorDisplay, EmptyState } from "@/components/shared";
import KybReviewPane from "@/components/admin/KybReviewPane";
import {
  ClipboardCheck,
  RefreshCw,
  Calendar,
  Building2,
  Globe,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type KybStatus = "pending" | "unverified" | "approved" | "rejected";

interface MerchantKybSummary {
  merchantId: string;
  businessName: string;
  businessType: string;
  country: string;
  industry: string;
  contactEmail: string;
  kybStatus: KybStatus;
  submittedAt: string | null;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  KybStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  unverified: {
    label: "Unverified",
    icon: AlertCircle,
    className: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
};

function KybStatusBadge({ status }: { status: KybStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, icon: AlertCircle, className: "" };
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-semibold flex items-center gap-1 w-fit", cfg.className)}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b last:border-b-0">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  );
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({ merchants }: { merchants: MerchantKybSummary[] }) {
  const pending = merchants.filter((m) => m.kybStatus === "pending").length;
  const unverified = merchants.filter((m) => m.kybStatus === "unverified").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatChip label="Total in queue" value={merchants.length} icon={ClipboardCheck} color="primary" />
      <StatChip label="Pending review" value={pending} icon={Clock} color="yellow" />
      <StatChip label="Unverified" value={unverified} icon={AlertCircle} color="orange" />
      <StatChip label="Countries" value={new Set(merchants.map((m) => m.country)).size} icon={Globe} color="blue" />
    </div>
  );
}

function StatChip({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: "primary" | "yellow" | "orange" | "blue";
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    yellow: "bg-yellow-500/10 text-yellow-600",
    orange: "bg-orange-500/10 text-orange-600",
    blue: "bg-blue-500/10 text-blue-600",
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MerchantsKybPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

  // ── Data fetch ───────────────────────────────────────────────────────────────

  const {
    data: rawData,
    isLoading,
    error: fetchError,
    refetch,
  } = useQuery<MerchantKybSummary[]>({
    queryKey: ["admin", "kyb-list", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await axios.get<{
        data: MerchantKybSummary[];
      }>(`/api/admin/merchants/kyb${params}`, { withCredentials: true });
      return res.data.data ?? [];
    },
  });

  const merchants: MerchantKybSummary[] = rawData ?? [];

  // ── Optimistic update after decision ────────────────────────────────────────

  const handleDecision = (
    merchantId: string,
    newStatus: "approved" | "rejected"
  ) => {
    // Update the list cache optimistically — no full reload needed.
    queryClient.setQueryData<MerchantKybSummary[]>(
      ["admin", "kyb-list", statusFilter],
      (old) =>
        (old ?? []).map((m) =>
          m.merchantId === merchantId ? { ...m, kybStatus: newStatus } : m
        )
    );
    // Invalidate so the next mount re-fetches clean data
    void queryClient.invalidateQueries({ queryKey: ["admin", "kyb-list"] });
  };

  // ── Filter by status ─────────────────────────────────────────────────────────

  const filteredMerchants =
    statusFilter === "all"
      ? merchants
      : merchants.filter((m) => m.kybStatus === statusFilter);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left: list */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 space-y-5 transition-all duration-300",
          selectedMerchantId ? "hidden lg:flex" : "flex"
        )}
      >
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              KYB Review Queue
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review merchant KYB submissions and issue approve/reject decisions.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && !fetchError && <StatsRow merchants={merchants} />}

        {/* Error */}
        {fetchError && (
          <ErrorDisplay
            message="Failed to load KYB queue."
            onRetry={() => void refetch()}
          />
        )}

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v); }}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pending</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {filteredMerchants.length}{" "}
              {filteredMerchants.length === 1 ? "merchant" : "merchants"}
            </span>
          )}
        </div>

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="px-4 py-3 border-b bg-muted/30">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Merchant</span>
              <span className="hidden sm:block">Country</span>
              <span>Status</span>
              <span>Submitted</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : filteredMerchants.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No merchants in queue"
                description={
                  statusFilter === "all"
                    ? "There are no merchants awaiting KYB review."
                    : `No merchants with status "${statusFilter}".`
                }
              />
            ) : (
              filteredMerchants.map((merchant) => (
                <button
                  key={merchant.merchantId}
                  onClick={() => setSelectedMerchantId(merchant.merchantId)}
                  className={cn(
                    "w-full text-left grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-4 py-4 border-b last:border-b-0 hover:bg-muted/40 transition-colors",
                    selectedMerchantId === merchant.merchantId &&
                      "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  aria-current={
                    selectedMerchantId === merchant.merchantId ? "true" : undefined
                  }
                >
                  {/* Business name + email */}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {merchant.businessName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {merchant.industry}
                      <span className="mx-1">·</span>
                      {merchant.contactEmail}
                    </p>
                  </div>

                  {/* Country */}
                  <span className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                    <Globe className="w-3 h-3" />
                    {merchant.country}
                  </span>

                  {/* Status badge */}
                  <KybStatusBadge status={merchant.kybStatus} />

                  {/* Submitted */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {fmtRelative(merchant.submittedAt)}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 ml-1" />
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: review pane */}
      {selectedMerchantId && (
        <div
          className={cn(
            "w-full lg:w-[480px] lg:ml-4 flex-shrink-0 border rounded-xl overflow-hidden shadow-md bg-background",
            "flex flex-col"
          )}
          style={{ maxHeight: "calc(100vh - 10rem)" }}
        >
          <KybReviewPane
            merchantId={selectedMerchantId}
            onClose={() => setSelectedMerchantId(null)}
            onDecision={handleDecision}
          />
        </div>
      )}
    </div>
  );
}
