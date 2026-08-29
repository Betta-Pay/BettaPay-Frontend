"use client";

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { CurrencyDisplay, StatCard, ErrorDisplay } from '@/components/shared';
import { PageHeader } from '@/components/shared/PageHeader';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { usePayments } from '@/lib/api/hooks';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  CreditCard,
  RefreshCcw,
  Plus,
  TrendingUp,
  BarChart3,
  Copy,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), {
  ssr: false,
  loading: () => <div className="h-[260px] bg-muted animate-pulse rounded-xl w-full" />,
});
import { aggregatePaymentsByDay, mockChartData } from '@/components/charts/RevenueChart';

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const notify = useNotify();
  const { data: payments, isLoading: paymentsLoading } = usePayments();


  const [activePeriod, setActivePeriod] = useState<Period>('7D');

  // Error simulation states
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [linksError, setLinksError] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'Merchant';

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      notify.success('Copied to clipboard');
    },
    [notify]
  );

  const handlePeriodChange = useCallback((p: Period) => {
    setActivePeriod(p);
  }, []);

  const toggleSimulation = () => {
    const nextState = !simulationEnabled;
    setSimulationEnabled(nextState);
    setStatsError(nextState);
    setChartError(nextState);
    setLinksError(nextState);
  };

  // --- Derived chart data: single source of truth for both header total and bars ---
  const chartData = useMemo(() => {
    if (!payments || payments.length === 0) {
      return mockChartData;
    }
    // Filter by activePeriod window
    const now = new Date();
    const days = activePeriod === '7D' ? 7 : activePeriod === '30D' ? 30 : 90;
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - days);
    const filtered = (payments as unknown as { createdAt: string; amountUsdc: number; status?: string }[]).filter((p) => {
      const d = new Date(p.createdAt);
      return !Number.isNaN(d.getTime()) && d >= cutoff;
    });
    // If filter yields nothing, aggregate empty -> fallback to mock for preview (consistent with RevenueChart)
    const source = filtered.length > 0 ? filtered : payments;
    const aggregated = aggregatePaymentsByDay(source as unknown as { amountUsdc: number; createdAt: string; status?: string }[]);
    return aggregated.length > 0 ? aggregated : mockChartData;
  }, [payments, activePeriod]);

  const totalRevenue = useMemo(() => chartData.reduce((sum, p) => sum + p.total, 0), [chartData]);
  const peakDay = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((max, p) => (p.total > max.total ? p : max), chartData[0]);
  }, [chartData]);
  const weeklyAvg = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(totalRevenue / chartData.length);
  }, [totalRevenue, chartData.length]);

  return (
    <div className="space-y-8 pb-8">
      {/* ── Welcome Header ── */}
      <PageHeader
        preTitle="Merchant Dashboard"
        title={`Good day, ${firstName} 👋`}
        titleClassName="leading-tight"
        description="Here's what's happening with your BettaPay account today."
        actions={
          <>
            <Button
              variant="outline"
              className={cn(
                'rounded-xl h-10 px-4 text-sm transition-all border',
                simulationEnabled
                  ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
              onClick={toggleSimulation}
            >
              {simulationEnabled ? 'Reset API' : 'Simulate API Error'}
            </Button>
            <Link href="/payments">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-4 text-sm shadow-button transition-all">
                <Plus className="w-4 h-4 mr-2" />
                New Payment Link
              </Button>
            </Link>
          </>
        }
      />

      {/* ── Onboarding Checklist ── */}
      <OnboardingChecklist />

      {/* ── KPI Stat Cards (memoised — not affected by period changes) ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {statsError ? (
          <div className="col-span-full">
            <ErrorDisplay
              message="Failed to load statistics"
              onRetry={() => setStatsError(false)}
            />
          </div>
        ) : (
          <>
            <StatCard
              title="Total Volume (30d)"
              icon={Activity}
              color="amber"
              value={<CurrencyDisplay amount={45231.89} />}
              trend={{ icon: ArrowUpRight, label: "+20.1% from last month", color: "text-emerald-600" }}
            />
            <StatCard
              title="Active Payment Links"
              icon={CreditCard}
              color="blue"
              value="12"
              trend={{ label: "+3 new links this week" }}
            />
            <StatCard
              title="Available to Settle"
              icon={Wallet}
              color="emerald"
              value={<CurrencyDisplay amount={12450.00} />}
              trend={{ icon: ArrowDownRight, label: "Pending NGN conversion", color: "text-primary" }}
            />
            <StatCard
              title="Current FX Rate"
              icon={RefreshCcw}
              color="purple"
              value="₦1,550"
              trend={{ label: "per USDC · Updated 5m ago" }}
            />
          </>
        )}
      </div>

      {/* ── Charts + Recent Transactions ── */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Revenue Chart - header total derived from same chartData passed to chart */}
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Revenue Over Time</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">USDC received to your merchant wallet</p>
                <p className="text-sm font-bold text-foreground mt-1.5" aria-label={`Total revenue $${totalRevenue.toLocaleString()}`}>
                  Total · ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
                  onRetry={() => setChartError(false)}
                />
              </div>
            ) : (
              <RevenueChart height={260} data={chartData} isLoading={paymentsLoading} />
            )}
            {/* Summary row - all values derived from chartData (peak, avg) */}
            <div className="flex items-center gap-6 pt-4 border-t border-border mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Peak day</p>
                <p className="text-sm font-semibold text-foreground" data-testid="revenue-peak">{peakDay ? `${peakDay.name} · $${peakDay.total.toLocaleString()}` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weekly avg</p>
                <p className="text-sm font-semibold text-foreground" data-testid="revenue-avg">${weeklyAvg.toLocaleString()}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-success text-xs font-semibold bg-success/10 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                +18.4% WoW
              </div>
            </div>
            <span className="sr-only" data-testid="revenue-total" data-total={totalRevenue}>Total revenue {totalRevenue}</span>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <ActivityFeed className="lg:col-span-3" />
      </div>

      {/* ── Bottom Row: Quick Actions + Payment Link Performance ── */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Quick Actions */}
        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 grid grid-cols-2 gap-3">
            {[
              { label: 'Create Payment Link', icon: Plus, href: '/payments', color: 'amber' },
              { label: 'View Transactions', icon: BarChart3, href: '/transactions', color: 'blue' },
              { label: 'Settle Funds', icon: Wallet, href: '/settlement', color: 'emerald' },
              { label: 'Check FX Rate', icon: RefreshCcw, href: '/fx', color: 'purple' },
            ].map(({ label, icon: Icon, href, color }) => (
              <Link key={href} href={href}>
                <div className={cn(
                  'flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm',
                  color === 'amber' && 'border-primary/30 bg-primary/10 hover:bg-primary/20',
                  color === 'blue' && 'border-info/30 bg-info/10 hover:bg-info/20',
                  color === 'emerald' && 'border-success/30 bg-success/10 hover:bg-success/20',
                  color === 'purple' && 'border-accent bg-accent/50 hover:bg-accent/80',
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'amber' && 'text-primary',
                    color === 'blue' && 'text-info',
                    color === 'emerald' && 'text-success',
                    color === 'purple' && 'text-accent-foreground',
                  )} />
                  <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Payment Link Performance */}
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Payment Link Performance</CardTitle>
              <Link href="/payments">
                <Button variant="ghost" className="text-xs text-primary hover:text-primary hover:bg-primary/10 min-h-[44px] px-2 rounded-lg font-semibold">
                  Manage <ArrowRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {linksError ? (
              <div className="py-8">
                <ErrorDisplay
                  message="Failed to load payment links"
                  onRetry={() => setLinksError(false)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((link) => {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
                  const linkUrl = `${baseUrl}/pay/${link.id}`;
                  const clicks = link.clicks ?? 0;
                  const converted = link.converted ?? 0;
                  const conversionRate = clicks > 0 ? (converted / clicks) * 100 : 0;
                  const rateLabel = clicks > 0 ? `${conversionRate.toFixed(0)}%` : 'No data';

                  return (
                    <Link
                      key={link.id}
                      href={`/payments/${link.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{link.source ?? 'Payment Link'}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{linkUrl}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            {clicks > 0 && (
                              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${conversionRate}%` }} />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{rateLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-foreground"><CurrencyDisplay amount={link.amountUsdc} currency="USDC" /></span>
                        <span className="text-xs text-muted-foreground">{link.clicks ?? 0} clicks</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" aria-label="Copy payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(`${baseUrl}/pay/${link.id}`); }}>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Open payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`${baseUrl}/pay/${link.id}`, '_blank'); }}>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
