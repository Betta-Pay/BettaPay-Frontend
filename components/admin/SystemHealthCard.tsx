"use client";

import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSystemHealth } from "@/lib/hooks/useSystemHealth";
import type { ServiceHealth, ServiceStatus } from "@/lib/types/health";
import {
  STATUS_TONE_DOT,
  STATUS_TONE_TEXT,
  type StatusTone,
} from "@/lib/status/palette";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

// These labels sit directly on the card with no tinted pill behind them, so
// the foreground alone has to clear AA against `--card`. The raw
// `text-green-600` / `text-yellow-600` pairings used previously did not
// (3.0:1 and 3.2:1 on white); the audited status tones do.
const STATUS_CONFIG: Record<
  ServiceStatus,
  {
    icon: LucideIcon;
    label: string;
    tone: StatusTone;
  }
> = {
  healthy: { icon: CheckCircle2, label: "Healthy", tone: "ok" },
  degraded: { icon: AlertTriangle, label: "Degraded", tone: "warn" },
  unhealthy: { icon: XCircle, label: "Unhealthy", tone: "down" },
};

function formatLatency(ms?: number): string {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCheckedAt(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ServiceSkeleton() {
  return (
    // Fixed height to avoid layout shift
    <div className="flex items-center justify-between min-h-[44px]" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="w-2 h-2 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single service row
// ---------------------------------------------------------------------------

interface ServiceRowProps {
  service: ServiceHealth;
}

function ServiceRow({ service }: ServiceRowProps) {
  const config = STATUS_CONFIG[service.status];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = config.icon as any;
  const latency = formatLatency(service.latencyMs);
  const checkedAt = formatCheckedAt(service.checkedAt);

  return (
    // min-h prevents layout shifts between loading/loaded states
    <div
      className="flex items-start justify-between min-h-[44px]"
      role="listitem"
      // Screen readers hear the full status inline
      aria-label={`${service.label}: ${config.label}${latency ? `, ${latency}` : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Color dot (decorative — status label is the accessible text) */}
        <div
          className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", STATUS_TONE_DOT[config.tone])}
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <p className="text-sm font-medium text-foreground leading-snug">
            {service.label}
          </p>

          {/* Status + icon together (not color-only) */}
          <span className={cn("text-xs font-medium flex items-center gap-1", STATUS_TONE_TEXT[config.tone])}>
            <Icon
              className="w-3 h-3"
              aria-hidden="true"
            />
            {config.label}
          </span>

          {/* Error message when unhealthy */}
          {service.status === "unhealthy" && service.errorMessage && (
            <p className="text-xs text-status-down mt-0.5 max-w-[180px] leading-tight">
              {service.errorMessage}
            </p>
          )}

          {/* Degraded: show error or hint */}
          {service.status === "degraded" && service.errorMessage && (
            <p className="text-xs text-status-warn mt-0.5 max-w-[180px] leading-tight">
              {service.errorMessage}
            </p>
          )}
        </div>
      </div>

      {/* Right-side metadata */}
      <div className="flex flex-col items-end text-right gap-0.5 flex-shrink-0">
        {latency && (
          <span
            className={cn(
              "text-xs font-mono",
              service.status === "degraded"
                ? "text-status-warn"
                : service.status === "unhealthy"
                ? "text-status-down"
                : "text-muted-foreground"
            )}
          >
            {latency}
          </span>
        )}
        {checkedAt && (
          <time
            dateTime={service.checkedAt}
            className="text-[10px] text-muted-foreground/60"
          >
            {checkedAt}
          </time>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------

interface ErrorBannerProps {
  message: string;
  hasStaleData: boolean;
}

function ErrorBanner({ message, hasStaleData }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
    >
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>
        {message}
        {hasStaleData && " — showing last known data."}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SystemHealthCard — the exported component
// ---------------------------------------------------------------------------

export function SystemHealthCard() {
  const { data, loading, error, lastSuccessAt, refresh } = useSystemHealth();

  // Determine overall section status for ARIA live region
  const hasUnhealthy = data?.services.some((s) => s.status === "unhealthy");

  return (
    <Card className="col-span-3 bg-card border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>System Health</CardTitle>

        <div className="flex items-center gap-2">
          {/* Last-success timestamp */}
          {lastSuccessAt && !loading && (
            <time
              dateTime={lastSuccessAt}
              className="text-[10px] text-muted-foreground/60 hidden sm:block"
              title={`Last refreshed at ${lastSuccessAt}`}
            >
              Updated {formatCheckedAt(lastSuccessAt)}
            </time>
          )}

          {/* Manual refresh button */}
          <button
            onClick={refresh}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            aria-label="Refresh system health"
            title="Refresh"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loading && "animate-spin")}
              aria-hidden="true"
            />
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Announce status changes to screen readers */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {loading
            ? "Loading system health data"
            : hasUnhealthy
            ? "One or more services are unhealthy"
            : "All services are operational"}
        </div>

        <div className="space-y-5">
          {/* Error banner — shown above stale data, not instead of it */}
          {error && <ErrorBanner message={error} hasStaleData={data !== null} />}

          {/* Service list */}
          <div role="list" aria-label="Service statuses" className="space-y-5">
            {loading && !data ? (
              // Initial load skeleton (4 rows)
              <>
                <ServiceSkeleton />
                <ServiceSkeleton />
                <ServiceSkeleton />
                <ServiceSkeleton />
              </>
            ) : data ? (
              data.services.map((svc) => (
                <ServiceRow key={svc.service} service={svc} />
              ))
            ) : (
              // No data and no error yet — transient state
              <>
                <ServiceSkeleton />
                <ServiceSkeleton />
                <ServiceSkeleton />
                <ServiceSkeleton />
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
