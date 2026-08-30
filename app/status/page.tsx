"use client";

import { useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

import { Header, Footer } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { OverallBanner } from "@/components/status/OverallBanner";
import { ComponentStatusGrid } from "@/components/status/ComponentStatus";
import { IncidentTimeline } from "@/components/status/IncidentTimeline";
import { SubscribeForm } from "@/components/status/SubscribeForm";
import {
  mapServicesToComponents,
  deriveIncidents,
  getOverallStatus,
} from "@/lib/status/data";
import {
  useSystemHealth,
  PUBLIC_HEALTH_ENDPOINT,
} from "@/lib/hooks/useSystemHealth";
import { useNow } from "@/lib/hooks/useNow";
import { formatRelativeTime } from "@/lib/status/time";
import { cn } from "@/lib/utils";

function ComponentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatusPage() {
  // Same polling hook the admin System Health card uses, pointed at the
  // public (unauthenticated) endpoint. It polls every 20s, pauses when the
  // tab is hidden, and keeps the last good payload if a refetch fails.
  const { data, loading, error, lastSuccessAt, refresh } = useSystemHealth(
    PUBLIC_HEALTH_ENDPOINT,
  );
  const now = useNow();

  const components = useMemo(() => mapServicesToComponents(data), [data]);
  const incidents = useMemo(() => deriveIncidents(components), [components]);
  const overall = getOverallStatus(components);

  const checkedAt = data?.aggregatedAt ?? lastSuccessAt;
  const firstLoad = loading && !data;

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                System Status
              </h1>
              <p className="text-muted-foreground">
                Live health monitoring for all BettaPay services.
                {checkedAt && (
                  <>
                    {" "}
                    Last checked{" "}
                    <time dateTime={checkedAt}>
                      {formatRelativeTime(checkedAt, now)}
                    </time>
                    .
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className={cn(
                "rounded-md p-2 text-muted-foreground transition-colors shrink-0",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-label="Refresh system status"
              title="Refresh"
            >
              <RefreshCw
                className={cn("w-4 h-4", loading && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 rounded-lg border border-status-warn-border bg-status-warn-bg px-4 py-3 text-sm text-status-warn"
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                Couldn&apos;t reach the health service
                {data
                  ? " — showing the last successful check below."
                  : ". Service status is currently unknown."}
              </span>
            </div>
          )}

          <OverallBanner status={overall.level} label={overall.label} />

          <section aria-labelledby="components-heading">
            <h2
              id="components-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Services
            </h2>
            {firstLoad ? (
              <ComponentGridSkeleton />
            ) : (
              <ComponentStatusGrid components={components} />
            )}
          </section>

          <section aria-labelledby="incidents-heading">
            <h2
              id="incidents-heading"
              className="text-lg font-semibold text-foreground mb-4"
            >
              Active Incidents
            </h2>
            <IncidentTimeline incidents={incidents} />
          </section>

          <section aria-labelledby="subscribe-heading" className="space-y-3">
            <h2
              id="subscribe-heading"
              className="text-lg font-semibold text-foreground"
            >
              Subscribe to Updates
            </h2>
            <SubscribeForm />
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
