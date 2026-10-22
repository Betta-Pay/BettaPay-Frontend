"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CheckCircle2, PauseCircle, Radio } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeverityBadge } from "@/components/admin/alerts/SeverityBadge";
import { SimulateMetricPanel } from "@/components/admin/alerts/SimulateMetricPanel";
import { useAlertFeed } from "@/lib/alerts/useAlertFeed";
import { useNotify } from "@/lib/hooks/useNotify";
import type { AlertEvent, AlertStatus } from "@/lib/alerts/types";

type Filter = "all" | AlertStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Unread" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "resolved", label: "Resolved" },
];

const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function AlertRow({
  event,
  onAck,
  onResolve,
}: {
  event: AlertEvent;
  onAck: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  return (
    <li
      data-testid="alert-row"
      data-status={event.status}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={event.severity} />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {STATUS_LABEL[event.status]}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">{event.title}</p>
        <p className="text-sm text-muted-foreground">{event.message}</p>
        <p className="text-xs text-muted-foreground">
          Raised {formatTime(event.createdAt)}
          {event.acknowledgedAt && ` · Acknowledged ${formatTime(event.acknowledgedAt)} by ${event.acknowledgedBy}`}
          {event.resolvedAt &&
            ` · Resolved ${formatTime(event.resolvedAt)}${event.resolvedBy === "auto" ? " (metric recovered)" : ""}`}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {event.status === "open" && (
          <Button size="sm" variant="outline" onClick={() => onAck(event.id)}>
            Acknowledge
          </Button>
        )}
        {event.status !== "resolved" && (
          <Button size="sm" variant="ghost" onClick={() => onResolve(event.id)}>
            Resolve
          </Button>
        )}
      </div>
    </li>
  );
}

export default function AdminAlertsPage() {
  const notify = useNotify();
  const feed = useAlertFeed();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? feed.events : feed.events.filter((e) => e.status === filter)),
    [feed.events, filter],
  );

  const run = async (action: () => Promise<void>, failure: string) => {
    try {
      await action();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : failure);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Operations"
        title="Alerts"
        description="Threshold alerts for settlements, FX rates, anchors and sign-in lockouts."
        actions={
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            {feed.paused ? (
              <>
                <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" /> Paused while tab is hidden
              </>
            ) : (
              <>
                <Radio className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> Live
              </>
            )}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter alerts">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === f.id ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
            }`}
          >
            {f.label}
            {f.id === "open" && (
              <span data-testid="unread-count" className="ml-1.5 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                {feed.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {feed.error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {feed.error}
        </p>
      )}

      {!feed.loaded ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filter === "all" ? CheckCircle2 : BellRing}
          title={filter === "all" ? "No alerts" : "Nothing here"}
          description="Alerts appear here within a few seconds of a threshold being crossed."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((event) => (
            <AlertRow
              key={event.id}
              event={event}
              onAck={(id) => void run(() => feed.acknowledge(id), "Unable to acknowledge alert")}
              onResolve={(id) => void run(() => feed.resolve(id), "Unable to resolve alert")}
            />
          ))}
        </ul>
      )}

      <Card className="border border-border bg-card">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Rules</h2>
            <Link href="/admin/settings" className="text-sm font-medium text-primary hover:underline">
              Edit thresholds
            </Link>
          </div>
          <ul className="divide-y">
            {feed.rules.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{rule.name}</span>
                <span className="text-muted-foreground">
                  ≥ {rule.threshold} {rule.unit} · {rule.windowMinutes} min · {rule.enabled ? "On" : "Off"}
                </span>
                <SeverityBadge severity={rule.severity} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {process.env.NODE_ENV !== "production" && (
        <SimulateMetricPanel rules={feed.rules} simulate={feed.simulate} />
      )}
    </div>
  );
}
