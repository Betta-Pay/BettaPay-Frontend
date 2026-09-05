"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Toggle,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui";
import { StatCard, EmptyState } from "@/components/shared";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import {
  Anchor,
  Search,
  Plus,
  RefreshCcw,
  Activity,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Eye,
  Globe,
} from "lucide-react";
import type { Anchor as AnchorType, AnchorWithHealth } from "@/lib/types";

// ─── Inline hooks (kept local to avoid polluting global hooks for now) ────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/axios";

function useAnchorHealthMatrix() {
  return useQuery<{ data: AnchorWithHealth[] }, Error>({
    queryKey: ["admin", "anchors", "health"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AnchorWithHealth[] }>(
        "/api/admin/anchors/health"
      );
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

function useToggleAnchor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiClient.patch(`/api/admin/anchors/${id}`, { enabled });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "anchors"] });
    },
  });
}

function useDeleteAnchor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/admin/anchors/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "anchors"] });
    },
  });
}

function useCreateAnchor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      code: string;
      currency: string;
      country: string;
      flag: string;
      kycLevels: string[];
      settlementTime: string;
      websiteUrl: string | null;
    }) => {
      const res = await apiClient.post<{ data: AnchorType }>(
        "/api/admin/anchors",
        data
      );
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "anchors"] });
    },
  });
}

// ─── Status helpers ────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-yellow-500",
  unreachable: "bg-red-500",
  unchecked: "bg-muted",
};

const HEALTH_LABEL: Record<string, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  unreachable: "Unreachable",
  unchecked: "Unchecked",
};

// ─── Detail Drawer ─────────────────────────────────────────────────────────────

function AnchorDetailDialog({
  anchor,
  open,
  onOpenChange,
}: {
  anchor: AnchorWithHealth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const health = anchor.health;
  const stats = anchor.stats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">{anchor.flag}</span>
            {anchor.name}
          </DialogTitle>
          <DialogDescription>
            {anchor.currency} · {anchor.country}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Health Status */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Live Health Status
            </h4>
            <div className="flex items-center gap-3">
              <div
                className={`w-2.5 h-2.5 rounded-full ${HEALTH_COLOR[health?.status ?? "unchecked"]}`}
              />
              <span className="text-sm font-medium">
                {HEALTH_LABEL[health?.status ?? "unchecked"]}
              </span>
              {health?.latencyMs != null && (
                <span className="text-xs font-mono text-muted-foreground ml-auto">
                  {health.latencyMs}ms
                </span>
              )}
            </div>
            {health?.errorMessage && (
              <p className="text-xs text-destructive">{health.errorMessage}</p>
            )}
            {health?.checkedAt && (
              <p className="text-xs text-muted-foreground">
                Checked: {new Date(health.checkedAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Settlement Stats */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground">
              Settlement Volume (30d)
            </h4>
            {stats && stats.settlementCount > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="text-sm font-bold font-mono">
                    {stats.totalVolumeUsdc.toLocaleString()} USDC
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Settlements</p>
                  <p className="text-sm font-bold">
                    {stats.settlementCount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failures</p>
                  <p className="text-sm font-bold text-destructive">
                    {stats.failureCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failure Rate</p>
                  <p
                    className={`text-sm font-bold ${stats.failureRate > 2 ? "text-destructive" : "text-emerald-600"}`}
                  >
                    {stats.failureRate.toFixed(2)}%
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No settlement data in the last 30 days.
              </p>
            )}
            {stats?.lastSettlementAt && (
              <p className="text-xs text-muted-foreground">
                Last settlement:{" "}
                {new Date(stats.lastSettlementAt).toLocaleString()}
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-border p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              Configuration
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono font-medium">{anchor.code}</span>
              <span className="text-muted-foreground">KYC Levels</span>
              <span>{anchor.kycLevels.join(", ")}</span>
              <span className="text-muted-foreground">Settlement Time</span>
              <span>{anchor.settlementTime}</span>
              <span className="text-muted-foreground">Status</span>
              <span>{anchor.enabled ? "Enabled" : "Disabled"}</span>
            </div>
            {anchor.websiteUrl && (
              <a
                href={anchor.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                Visit website
              </a>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Dialog ─────────────────────────────────────────────────────────────

function CreateAnchorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateAnchor();
  const [form, setForm] = useState({
    name: "",
    code: "",
    currency: "",
    country: "",
    flag: "",
    kycLevels: "basic",
    settlementTime: "",
    websiteUrl: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name: form.name,
        code: form.code,
        currency: form.currency,
        country: form.country,
        flag: form.flag,
        kycLevels: form.kycLevels.split(",").map((s) => s.trim()) as string[],
        settlementTime: form.settlementTime || "Pending",
        websiteUrl: form.websiteUrl || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({
            name: "",
            code: "",
            currency: "",
            country: "",
            flag: "",
            kycLevels: "basic",
            settlementTime: "",
            websiteUrl: "",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Anchor</DialogTitle>
          <DialogDescription>
            Register a new SEP-24 anchor for fiat settlement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Cowrie Integrated"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Code *
              </label>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="COWRIE"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Currency *
              </label>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                placeholder="NGN"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Country *
              </label>
              <Input
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                placeholder="Nigeria"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Flag emoji
              </label>
              <Input
                value={form.flag}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flag: e.target.value }))
                }
                placeholder="\u{1F1F3}\u{1F1EC}"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                KYC Levels
              </label>
              <Input
                value={form.kycLevels}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kycLevels: e.target.value }))
                }
                placeholder="basic, intermediate"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Settlement Time
              </label>
              <Input
                value={form.settlementTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, settlementTime: e.target.value }))
                }
                placeholder="Instant (< 2 mins)"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Website URL
              </label>
              <Input
                value={form.websiteUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, websiteUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          {createMutation.isError && (
            <p className="text-xs text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Add Anchor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminAnchorsPage() {
  const { data, isLoading, error, refetch } = useAnchorHealthMatrix();
  const toggleMutation = useToggleAnchor();
  const deleteMutation = useDeleteAnchor();
  const [search, setSearch] = useState("");
  const [detailAnchor, setDetailAnchor] = useState<AnchorWithHealth | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);

  const anchors = data?.data ?? [];

  const filtered = anchors.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.currency.toLowerCase().includes(search.toLowerCase()) ||
      a.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = useCallback(
    (id: string, currentEnabled: boolean) => {
      toggleMutation.mutate({ id, enabled: !currentEnabled });
    },
    [toggleMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Remove this anchor? This action cannot be undone.")) {
        deleteMutation.mutate(id);
      }
    },
    [deleteMutation]
  );

  // Summary stats
  const totalAnchors = anchors.length;
  const enabledCount = anchors.filter((a) => a.enabled).length;
  const healthyCount = anchors.filter(
    (a) => a.health?.status === "healthy"
  ).length;
  const totalVolume = anchors.reduce(
    (sum, a) => sum + (a.stats?.totalVolumeUsdc ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Anchor className="w-7 h-7 text-primary" />
            Anchor Registry
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage SEP-24 anchors, monitor health, and review settlement
            performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isLoading}
          >
            <RefreshCcw
              className={`w-4 h-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Anchor
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Anchors"
          icon={Anchor}
          color="primary"
          value={totalAnchors.toString()}
          trend={{ label: `${enabledCount} enabled` }}
        />
        <StatCard
          title="Healthy"
          icon={Activity}
          color="emerald"
          value={healthyCount.toString()}
          trend={{
            label: `${totalAnchors - healthyCount} need attention`,
            color: "text-muted-foreground",
          }}
        />
        <StatCard
          title="30d Volume"
          icon={Globe}
          color="blue"
          value={`${(totalVolume / 1000).toFixed(1)}k`}
          trend={{ label: "USDC total across all anchors" }}
        />
        <StatCard
          title="Settlement Alerts"
          icon={AlertTriangle}
          variant={
            anchors.some((a) => (a.stats?.failureRate ?? 0) > 2)
              ? "destructive"
              : undefined
          }
          value={
            anchors
              .filter((a) => (a.stats?.failureRate ?? 0) > 2)
              .length.toString()
          }
          trend={{ label: "Anchors with >2% failure rate" }}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search anchors by name, code, currency..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="bg-card border shadow-sm">
        <CardContent className="p-0">
          {isLoading && anchors.length === 0 ? (
            <div className="p-8 flex items-center justify-center">
              <RefreshCcw className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading anchors...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Anchor}
                title="No anchors found"
                description={
                  search
                    ? "Try a different search term."
                    : "Add your first anchor to get started."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anchor</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>KYC Levels</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Volume (30d)</TableHead>
                  <TableHead className="text-right">Fail Rate</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((anchor) => {
                  const stats = anchor.stats;
                  const health = anchor.health;
                  return (
                    <TableRow
                      key={anchor.id}
                      className="cursor-pointer"
                      onClick={() => setDetailAnchor(anchor)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{anchor.flag}</span>
                          <div>
                            <p className="font-medium text-foreground">
                              {anchor.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {anchor.code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary">
                          {anchor.currency}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {anchor.country}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {anchor.kycLevels.map((level) => (
                            <Badge key={level} variant="secondary" className="text-[10px]">
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${HEALTH_COLOR[health?.status ?? "unchecked"]}`}
                          />
                          <span className="text-xs font-medium">
                            {HEALTH_LABEL[health?.status ?? "unchecked"]}
                          </span>
                          {health?.latencyMs != null && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {health.latencyMs}ms
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-medium">
                          {stats && stats.settlementCount > 0
                            ? `${stats.totalVolumeUsdc.toLocaleString()}`
                            : "\u2014"}
                        </span>
                        {stats && stats.settlementCount > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            {stats.settlementCount.toLocaleString()} txns
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {stats && stats.settlementCount > 0 ? (
                          <span
                            className={`font-mono text-sm font-medium ${stats.failureRate > 2 ? "text-destructive" : "text-emerald-600"}`}
                          >
                            {stats.failureRate.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">\u2014</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Toggle
                          checked={anchor.enabled}
                          label={`Enable/disable ${anchor.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(anchor.id, anchor.enabled);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDetailAnchor(anchor)}
                            aria-label={`View ${anchor.name} details`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(anchor.id)}
                            aria-label={`Remove ${anchor.name}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      {detailAnchor && (
        <AnchorDetailDialog
          anchor={detailAnchor}
          open={Boolean(detailAnchor)}
          onOpenChange={(open) => {
            if (!open) setDetailAnchor(null);
          }}
        />
      )}

      {/* Create dialog */}
      <CreateAnchorDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
