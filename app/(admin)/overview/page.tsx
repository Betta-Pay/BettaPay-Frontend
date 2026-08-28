"use client";

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { CurrencyDisplay, ErrorDisplay, StatCard, ErrorBoundary } from '@/components/shared';
import { Users, AlertTriangle, ArrowUpRight, Activity, DollarSign } from 'lucide-react';
import { useAdminStats } from '@/lib/api/hooks';
import PlatformVolumeChart from '@/components/charts/PlatformVolumeChart';
import { PlatformTicker } from '@/components/admin/PlatformTicker';



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

export default function AdminOverviewPage() {
  const { data: stats, isLoading, error, refetch } = useAdminStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system health, total volume, and compliance alerts.
        </p>
      </div>

      {/* ── Real-Time Platform Volume & Fees Ticker (#473) ── */}
      <PlatformTicker />

      {error && (
        <ErrorDisplay
          message={`${error} Showing the last known figures.`}
          onRetry={refetch}
        />
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Processed (30d)"
              icon={Activity}
              color="primary"
              value={<CurrencyDisplay amount={stats.totalProcessed} />}
              trend={{
                icon: ArrowUpRight,
                label: `+${stats.totalProcessedChangePct}% from last month`,
                color: 'text-success',
              }}
            />
            <StatCard
              title="Platform Fees Generated"
              icon={DollarSign}
              color="emerald"
              value={<CurrencyDisplay amount={stats.platformFees} />}
              trend={{ label: `${stats.feeRatePct.toFixed(1)}% flat fee across volume` }}
            />
            <StatCard
              title="Active Merchants"
              icon={Users}
              color="blue"
              value={stats.activeMerchants.toLocaleString()}
              trend={{
                icon: ArrowUpRight,
                label: `+${stats.newMerchantsThisWeek} new this week`,
                color: 'text-success',
              }}
            />
            <StatCard
              title="Pending KYB Reviews"
              icon={AlertTriangle}
              value={stats.pendingKyb.toLocaleString()}
              variant="destructive"
              trend={{ label: 'Requires immediate action' }}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <AdminChartSection />

        <Card className="col-span-3 bg-card border shadow-sm">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">Stellar Horizon API</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">14ms ping</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">Soroban RPC</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">42ms ping</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">SEP-24 Anchor (NGN)</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Syncing</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div>
                    <p className="text-sm font-medium">PostgreSQL Database</p>
                    <p className="text-xs text-muted-foreground">High Load</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-warning">82% CPU</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
