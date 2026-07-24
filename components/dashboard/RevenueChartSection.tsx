"use client";

import { useState, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { ErrorDisplay } from '@/components/shared';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[260px] w-full rounded-xl" />,
});

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];

interface RevenueChartSectionProps {
  chartError: boolean;
  onRetry: () => void;
}

/**
 * Isolated chart section — owns its own activePeriod state so that toggling
 * 7D / 30D / 90D never causes the parent dashboard to re-render.
 */
export const RevenueChartSection = memo(function RevenueChartSection({
  chartError,
  onRetry,
}: RevenueChartSectionProps) {
  const [activePeriod, setActivePeriod] = useState<Period>('7D');

  const handlePeriodChange = useCallback((p: Period) => {
    setActivePeriod(p);
  }, []);

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
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
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
          <RevenueChart height={260} />
        )}
        {/* Summary row */}
        <div className="flex items-center gap-6 pt-4 border-t border-border mt-2">
          <div>
            <p className="text-xs text-muted-foreground">Peak day</p>
            <p className="text-sm font-semibold text-foreground">Saturday · $4,100</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Weekly avg</p>
            <p className="text-sm font-semibold text-foreground">$2,714</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            +18.4% WoW
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
