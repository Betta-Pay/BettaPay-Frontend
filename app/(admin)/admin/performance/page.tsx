"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ErrorDisplay } from "@/components/shared";
import { Activity, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMs, getMetricLabel } from "@/components/admin/performance/performanceFormat";
import type { DashboardResponse } from "@/components/admin/performance/performanceFormat";

const TrendChart = dynamic(
  () =>
    import("@/components/admin/performance/PerformanceCharts").then(
      (m) => m.TrendChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

const DistributionChart = dynamic(
  () =>
    import("@/components/admin/performance/PerformanceCharts").then(
      (m) => m.DistributionChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

// ─── Sub-components ───────────────────────────────────────────────────────────

function PercentileCard({
  label,
  value,
  metric,
}: {
  label: string;
  value: number;
  metric: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-foreground font-mono">
        {formatMs(value, metric)}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPerformancePage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [selectedRoute, setSelectedRoute] = useState<string>("__all__");
  const [selectedMetric, setSelectedMetric] = useState<string>("lcp");
  const [selectedDays, setSelectedDays] = useState<string>("7");

  const queryParams = new URLSearchParams();
  if (selectedRoute !== "__all__") queryParams.set("route", selectedRoute);
  queryParams.set("metric", selectedMetric);
  queryParams.set("days", selectedDays);

  const { data, isLoading, error, refetch } = useQuery<DashboardResponse>({
    queryKey: ["admin-performance", selectedRoute, selectedMetric, selectedDays],
    queryFn: async () => {
      const res = await axios.get(
        `/api/admin/performance?${queryParams.toString()}`
      );
      return res.data;
    },
  });

  const perfData = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Frontend Performance
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor Real User Monitoring (RUM) metrics across all routes.
        </p>
      </div>

      {error && (
        <ErrorDisplay
          message="Failed to load performance data. Please try again."
          onRetry={refetch}
        />
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMetric} onValueChange={(v) => { if (v) setSelectedMetric(v); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent>
            {(data?.metrics || ["lcp", "fcp", "cls"]).map((m) => (
              <SelectItem key={m} value={m}>
                {getMetricLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDays} onValueChange={(v) => { if (v) setSelectedDays(v); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24h</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedRoute} onValueChange={(v) => setSelectedRoute(v ?? "__all__")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Route" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All routes</SelectItem>
            {(data?.routes || []).map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {data && (
          <span className="text-xs text-muted-foreground ml-auto">
            {data.totalEvents.toLocaleString()} total events &middot;{" "}
            {data.timeRange.from.split("T")[0]} to{" "}
            {data.timeRange.to.split("T")[0]}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : perfData ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <PercentileCard
                  label="p50"
                  value={perfData.percentiles.p50}
                  metric={selectedMetric}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <PercentileCard
                  label="p75"
                  value={perfData.percentiles.p75}
                  metric={selectedMetric}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <PercentileCard
                  label="p90"
                  value={perfData.percentiles.p90}
                  metric={selectedMetric}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <PercentileCard
                  label="p95"
                  value={perfData.percentiles.p95}
                  metric={selectedMetric}
                />
              </CardContent>
            </Card>
          </div>

          {/* Trend chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {getMetricLabel(selectedMetric)} Trend
              </CardTitle>
              <CardDescription>
                Daily percentile trends ({selectedMetric === "cls" ? "unitless" : "milliseconds"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfData.trend.length > 0 ? (
                <TrendChart data={perfData.trend} metric={selectedMetric} isDark={isDark} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No trend data available for this time range.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Distribution chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {selectedRoute !== "__all__" ? selectedRoute : "All Routes"} —{" "}
                  {getMetricLabel(selectedMetric)} Distribution
                </CardTitle>
                <CardDescription>
                  Sample distribution across value ranges (
                  {perfData.sampleCount} samples)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {perfData.distribution.length > 0 ? (
                  <DistributionChart
                    data={perfData.distribution}
                    metric={selectedMetric}
                    isDark={isDark}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No distribution data available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Route summaries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Route-Level {getMetricLabel(selectedMetric)} Percentiles
                </CardTitle>
                <CardDescription>
                  p50/p75/p90/p95 by route
                </CardDescription>
              </CardHeader>
              <CardContent>
                {perfData.routeSummaries.length > 0 ? (
                  <div className="space-y-3">
                    {perfData.routeSummaries.map((summary) => (
                      <div
                        key={summary.route}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer",
                          selectedRoute === summary.route &&
                            "bg-primary/5 border-primary/20"
                        )}
                        onClick={() => setSelectedRoute(summary.route)}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground font-mono">
                            {summary.route}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {summary.count} samples
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-muted-foreground">
                            p50 {formatMs(summary.percentiles.p50, selectedMetric)}
                          </span>
                          <span className="text-muted-foreground">
                            p90 {formatMs(summary.percentiles.p90, selectedMetric)}
                          </span>
                          <span className="text-muted-foreground">
                            p95 {formatMs(summary.percentiles.p95, selectedMetric)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No route data available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* No data warning */}
          {perfData.sampleCount < 30 && (
            <Card className="border-warning/30 bg-warning/10">
              <CardContent className="flex items-start gap-3 p-3 sm:p-5">
                <Activity className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-warning">
                    Low sample size
                  </p>
                  <p className="text-xs text-warning mt-0.5">
                    With only {perfData.sampleCount} samples, percentile values
                    may not be statistically meaningful. Consider expanding the
                    time range.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No performance data available yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear once the RUM collector starts sending events.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
