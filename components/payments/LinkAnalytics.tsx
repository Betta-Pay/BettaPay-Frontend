"use client";

import { useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, Users, TrendingUp, DollarSign, Globe, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import dynamic from "next/dynamic";
import { Skeleton, Button } from "@/components/ui";
import { subDays, format } from "date-fns";
import { ErrorBoundary } from '@/components/shared';

const ClicksChart = dynamic(
  () => import("@/components/charts/ClicksChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
  }
);

export interface GeoData {
  country: string;
  visitors: number;
  percentage: number;
}

export interface ReferrerData {
  source: string;
  visits: number;
  percentage: number;
}

export interface ViewsTimelinePoint {
  date: string;
  clicks: number;
  conversions?: number;
  volume?: number;
}

export interface LinkAnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  revenue: number;
  currency: string;
  viewsTimeline: ViewsTimelinePoint[];
  geographicBreakdown: GeoData[];
  referrerList: ReferrerData[];
}

const FORMULA_INJECTION_REGEX = /^[=+\-@\t\r]/;
const NEGATIVE_NUMBER_REGEX = /^-\d+(\.\d+)?$/;

/**
 * Escapes a single CSV field according to RFC 4180 and neutralizes
 * spreadsheet formula injection prefixes.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);
  if (
    typeof value === "string" &&
    FORMULA_INJECTION_REGEX.test(str) &&
    !NEGATIVE_NUMBER_REGEX.test(str)
  ) {
    str = `'${str}`;
  }
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Transforms link analytics timeseries and summary metrics into an
 * RFC 4180 compliant CSV string.
 */
export function buildLinkAnalyticsCsv(data: LinkAnalyticsData): string {
  const headers = [
    "Date",
    "Clicks",
    "Conversions",
    "Volume",
    "Currency",
    "Total Views",
    "Unique Visitors",
    "Conversion Rate (%)",
  ];

  const totalClicks = data.viewsTimeline.reduce((sum, pt) => sum + pt.clicks, 0);

  const rows = data.viewsTimeline.map((pt) => {
    const conversions =
      pt.conversions ?? Math.round((pt.clicks * data.conversionRate) / 100);
    const volume =
      pt.volume ??
      Number(
        (
          totalClicks > 0
            ? (data.revenue / totalClicks) * pt.clicks
            : 0
        ).toFixed(2)
      );

    return [
      pt.date,
      pt.clicks,
      conversions,
      volume,
      data.currency,
      data.totalViews,
      data.uniqueVisitors,
      data.conversionRate,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
}

function generateViewsTimeline(): ViewsTimelinePoint[] {
  return Array.from({ length: 30 }, (_, i) => ({
    date: format(subDays(new Date(), 29 - i), "MMM d"),
    clicks: Math.floor(Math.random() * 15 + 1),
  }));
}

function generateGeoData(): GeoData[] {
  return [
    { country: "Nigeria", visitors: 145, percentage: 38 },
    { country: "Kenya", visitors: 89, percentage: 23 },
    { country: "South Africa", visitors: 67, percentage: 17 },
    { country: "Ghana", visitors: 42, percentage: 11 },
    { country: "Tanzania", visitors: 28, percentage: 7 },
    { country: "Other", visitors: 12, percentage: 4 },
  ];
}

function generateReferrerData(): ReferrerData[] {
  return [
    { source: "Direct", visits: 156, percentage: 41 },
    { source: "Twitter / X", visits: 89, percentage: 23 },
    { source: "WhatsApp", visits: 67, percentage: 17 },
    { country: undefined, source: "Telegram", visits: 42, percentage: 11 },
    { source: "Google", visits: 28, percentage: 7 },
    { source: "Other", visits: 12, percentage: 4 },
  ].map(({ source, visits, percentage }) => ({ source, visits, percentage }));
}

export interface LinkAnalyticsProps {
  views: number;
  uniquePayers: number;
  conversionRate: number;
  revenue: number;
  currency: string;
  timeline?: ViewsTimelinePoint[];
}

export function LinkAnalytics({
  views,
  conversionRate,
  revenue,
  currency,
  timeline,
}: LinkAnalyticsProps) {
  const analyticsData = useMemo<LinkAnalyticsData>(
    () => ({
      totalViews: views,
      uniqueVisitors: Math.round(views * 0.72),
      conversionRate,
      revenue,
      currency,
      viewsTimeline: timeline ?? generateViewsTimeline(),
      geographicBreakdown: generateGeoData(),
      referrerList: generateReferrerData(),
    }),
    [views, conversionRate, revenue, currency, timeline]
  );

  const handleExportCsv = useCallback(() => {
    const csv = buildLinkAnalyticsCsv(analyticsData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `link-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [analyticsData]);

  const kpiCards = [
    {
      label: "Total Views",
      value: analyticsData.totalViews.toLocaleString(),
      icon: Eye,
      gradient: "from-blue-50/60 to-transparent dark:from-blue-500/5",
      iconBg: "bg-info/20",
      iconColor: "text-info",
    },
    {
      label: "Unique Visitors",
      value: analyticsData.uniqueVisitors.toLocaleString(),
      icon: Users,
      gradient: "from-purple-50/60 to-transparent dark:from-purple-500/5",
      iconBg: "bg-purple-100 dark:bg-purple-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Conversion Rate",
      value: `${analyticsData.conversionRate}%`,
      icon: TrendingUp,
      gradient: "from-emerald-50/60 to-transparent dark:from-emerald-500/5",
      iconBg: "bg-success/20",
      iconColor: "text-success",
    },
    {
      label: "Revenue",
      value: formatCurrency(analyticsData.revenue),
      icon: DollarSign,
      gradient: "from-amber-50/60 to-transparent dark:from-amber-500/5",
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold text-foreground">
            Analytics Overview
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon as unknown as React.ComponentType<{ className?: string }>;
              return (
                <div
                  key={card.label}
                  className="relative overflow-hidden rounded-xl border border-border bg-card p-4"
                >
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br pointer-events-none",
                      card.gradient
                    )}
                  />
                  <div className="relative flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        card.iconBg
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", card.iconColor)} />
                    </div>
                  </div>
                  <div className="relative text-lg font-bold text-foreground">
                    {card.value}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Views Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
          <ErrorBoundary>
            <ClicksChart data={analyticsData.viewsTimeline} height={260} />
          </ErrorBoundary>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-info" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Geographic Distribution
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {analyticsData.geographicBreakdown.map((geo) => (
                <div key={geo.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">
                      {geo.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: `${geo.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                      {geo.visitors}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground">
              Referrer Sources
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.referrerList.map((ref) => (
              <div
                key={ref.source}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {ref.source}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ref.percentage}% of traffic
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {ref.visits}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
