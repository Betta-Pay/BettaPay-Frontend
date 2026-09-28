export interface PercentileResult {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  count: number;
  min: number;
  max: number;
}

export interface TrendPoint {
  date: string;
  percentiles: PercentileResult;
  count: number;
}

export interface DistributionBucket {
  lower: number;
  upper: number;
  count: number;
}

export interface RouteSummary {
  route: string;
  percentiles: PercentileResult;
  count: number;
}

export interface PerformanceData {
  metric: string;
  percentiles: PercentileResult;
  trend: TrendPoint[];
  routeSummaries: RouteSummary[];
  distribution: DistributionBucket[];
  route: string | null;
  sampleCount: number;
}

export interface DashboardResponse {
  routes: string[];
  metrics: string[];
  timeRange: { from: string; to: string };
  totalEvents: number;
  data: PerformanceData | null;
}

export function formatMs(value: number, metric: string): string {
  if (metric === "cls") return value.toFixed(3);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(2)}s`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    fcp: "First Contentful Paint",
    lcp: "Largest Contentful Paint",
    cls: "Cumulative Layout Shift",
    long_task: "Long Tasks",
    ttfb: "Time to First Byte",
    domContentLoaded: "DOMContentLoaded",
    load: "Load",
    route_change: "Route Change Duration",
    hydration_error: "Hydration Errors",
  };
  return labels[metric] || metric;
}