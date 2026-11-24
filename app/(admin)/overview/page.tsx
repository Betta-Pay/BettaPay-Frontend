"use client";

import { memo } from 'react';
import { SystemHealthCard } from '@/components/admin/SystemHealthCard';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { CurrencyDisplay, ErrorDisplay, StatCard, ErrorBoundary } from '@/components/shared';
import { Users, AlertTriangle, ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import { useAdminStats } from '@/lib/api/hooks';
import {
  formatCount,
  formatPercent,
  formatSignedPercent,
  percentOf,
  trendDirection,
  usableNumber,
} from '@/lib/utils/adminStats';

const PlatformVolumeChart = dynamic(
  () => import('@/components/charts/PlatformVolumeChart'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

// Memoised so future additions of state to the parent won't re-render the chart.
const AdminChartSection = memo(function AdminChartSection() {
  return (
    <Card className="col-span-4 bg-card border shadow-sm">
      <CardHeader>
        <CardTitle>Platform Volume vs Fees</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="mt-4">
          <ErrorBoundary>
            <PlatformVolumeChart height={300} />
          </ErrorBoundary>
        </div>
      </CardContent>
    </Card>
  );
});

function StatCardSkeleton() {
  return (
    <Card className="bg-card border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

// A fresh or empty environment can return zero, null or missing figures. Every
// KPI below goes through these guards so a card shows a real number, `0%` or
// an em dash, and never `NaN%`, `Infinity`, `+undefined%` or a thrown error.
const TREND_BY_DIRECTION = {
  up: { icon: ArrowUpRight, color: 'text-success' },
  down: { icon: ArrowDownRight, color: 'text-destructive' },
  flat: { icon: undefined, color: undefined },
} as const;

export default function AdminOverviewPage() {
  const { data: stats, isLoading, error, refetch, isSampleData } = useAdminStats();

  const volumeTrend = TREND_BY_DIRECTION[trendDirection(stats?.totalProcessedChangePct)];
  // Prefer the API's rate; when it is missing, derive it from fees / volume,
  // which is `null` (shown as an em dash) when volume is zero.
  const feeRatePct =
    usableNumber(stats?.feeRatePct) ?? percentOf(stats?.platformFees, stats?.totalProcessed);
  const newMerchants = usableNumber(stats?.newMerchantsThisWeek);
  const hasNewMerchants = newMerchants !== null && newMerchants > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system health, total volume, and compliance alerts.
        </p>
      </div>

      {isSampleData && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold">Sample data.</span> The admin
            analytics service is unavailable, so the figures below are
            illustrative placeholders — not real platform metrics.
          </span>
        </div>
      )}

      {error && !isSampleData && (
        <ErrorDisplay
          message={`${error} Platform metrics are unavailable.`}
          onRetry={refetch}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Processed (30d)"
            icon={Activity}
            color="primary"
            value={<CurrencyDisplay amount={usableNumber(stats.totalProcessed)} />}
            trend={{
              icon: volumeTrend.icon,
              label: `${formatSignedPercent(stats.totalProcessedChangePct)} from last month`,
              color: volumeTrend.color,
            }}
          />
          <StatCard
            title="Platform Fees Generated"
            icon={DollarSign}
            color="emerald"
            value={<CurrencyDisplay amount={usableNumber(stats.platformFees)} />}
            trend={{ label: `${formatPercent(feeRatePct)} flat fee across volume` }}
          />
          <StatCard
            title="Active Merchants"
            icon={Users}
            color="blue"
            value={formatCount(stats.activeMerchants)}
            trend={{
              icon: hasNewMerchants ? ArrowUpRight : undefined,
              label: `${hasNewMerchants ? '+' : ''}${formatCount(newMerchants)} new this week`,
              color: hasNewMerchants ? 'text-success' : undefined,
            }}
          />
          <StatCard
            title="Pending KYB Reviews"
            icon={AlertTriangle}
            value={formatCount(stats.pendingKyb)}
            variant="destructive"
            trend={{ label: 'Requires immediate action' }}
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-7">
        <AdminChartSection />

        <SystemHealthCard />
      </div>
    </div>
  );
}
