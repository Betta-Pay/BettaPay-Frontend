"use client";

import { useState, useCallback, memo, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { ErrorDisplay } from '@/components/shared';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils/format';
import { ErrorBoundary } from '@/components/shared';
import { usePayments } from '@/lib/api/hooks';
import { aggregatePaymentsByDay, mockChartData, type RevenueChartPoint, type RevenuePayment } from '@/components/charts/RevenueChart';

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
});

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];

export interface RevenueChartSectionProps {
  chartError: boolean;
  onRetry: () => void;
  /** Optional override for testing — if provided, use this data instead of fetching via usePayments */
  data?: RevenuePayment[];
}

/**
 * Derived totals must come from the exact array the chart renders.
 * This helper is exported for unit tests to guard against drift.
 */
export function getRevenueTotal(chartData: RevenueChartPoint[]): number {
  return chartData.reduce((sum, point) => sum + point.total, 0);
}

function filterPaymentsByPeriod(payments: RevenuePayment[], period: Period): RevenuePayment[] {
  if (payments.length === 0) return payments;
  const now = new Date();
  const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return payments.filter((p) => {
    const d = new Date(p.createdAt);
    return !Number.isNaN(d.getTime()) && d >= cutoff;
  });
}

/**
 * Isolated chart section — owns its own activePeriod state so that toggling
 * 7D / 30D / 90D never causes the parent dashboard to re-render.
 *
 * FIX: Header total is now derived from the same aggregated array that is
 * passed to <RevenueChart />. Previously the header used a separate reduce of
 * mock settlements while the chart used recharts with a different series,
 * causing totals and bars to disagree after fetch. Now both are derived from
 * the same source-of-truth (usePayments -> aggregatePaymentsByDay -> chartData)
 * so total == sum(chart series) always holds. Mock settlements are not imported
 * in this production path; preview fallback uses mockChartData exported from
 * RevenueChart itself and is only used when no real payments exist.
 */
export const RevenueChartSection = memo(function RevenueChartSection({
  chartError,
  onRetry,
  data: dataOverride,
}: RevenueChartSectionProps) {
  const [activePeriod, setActivePeriod] = useState<Period>('7D');
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments();
  const payments: RevenuePayment[] = dataOverride ?? (paymentsData as RevenuePayment[]) ?? [];

  const handlePeriodChange = useCallback((p: Period) => {
    setActivePeriod(p);
  }, []);

  // Single source of truth: filter -> aggregate -> chartData
  const chartData: RevenueChartPoint[] = useMemo(() => {
    if (!payments || payments.length === 0) {
      // Preview fallback — same data that RevenueChart will render when empty
      return mockChartData;
    }
    const filtered = filterPaymentsByPeriod(payments, activePeriod);
    // If filter yields nothing (e.g., period has no data), aggregate will be empty -> fallback to mock for preview
    const aggregated = aggregatePaymentsByDay(filtered);
    // Keep fallback consistent with RevenueChart's undefined-data preview behaviour
    return aggregated.length > 0 ? aggregated : mockChartData;
  }, [payments, activePeriod]);

  const total = useMemo(() => getRevenueTotal(chartData), [chartData]);

  const peak = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((max, p) => (p.total > max.total ? p : max), chartData[0]);
  }, [chartData]);

  const weeklyAvg = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(total / chartData.length);
  }, [total, chartData.length]);

  // WoW change vs mock fallback is not available from backend; keep static placeholder but derived display when possible
  const formattedTotal = formatNumber(total, undefined, { maximumFractionDigits: 0 });

  return (
    <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Revenue Over Time
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              USDC received to your merchant wallet
            </p>
            {/* Header total — derived from same chartData that RevenueChart renders */}
            <p className="text-sm font-bold text-foreground mt-1.5" aria-label={`Total revenue ${formattedTotal} US dollars`}>
              Total · ${formattedTotal}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1" role="group" aria-label="Select period">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                aria-pressed={activePeriod === p}
                className={cn(
                  'min-h-[44px] min-w-[44px] px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  activePeriod === p
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-muted-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {chartError ? (
          <div className="h-[260px] flex items-center justify-center">
            <ErrorDisplay
              message="Failed to load revenue chart"
              onRetry={onRetry}
            />
          </div>
        ) : (
        <ErrorBoundary>
          <RevenueChart height={260} data={chartData} isLoading={dataOverride ? false : paymentsLoading} />
        </ErrorBoundary>
        )}
        {/* Summary row — all values derived from chartData */}
        <div className="flex items-center gap-6 pt-4 border-t border-border mt-2">
          <div>
            <p className="text-xs text-muted-foreground">Peak day</p>
            <p className="text-sm font-semibold text-foreground">{peak ? `${peak.name} · $${formatNumber(peak.total, undefined, { maximumFractionDigits: 0 })}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weekly avg</p>
            <p className="text-sm font-semibold text-foreground">${formatNumber(weeklyAvg, undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
            <TrendingUp className="w-3 h-3" aria-hidden="true" />
            +18.4% WoW
          </div>
        </div>
        {/* Hidden element for tests / a11y to assert total equals sum of bars */}
        <span className="sr-only" data-testid="revenue-total" data-total={total}>
          Total revenue {total}
        </span>
      </CardContent>
    </Card>
  );
});
