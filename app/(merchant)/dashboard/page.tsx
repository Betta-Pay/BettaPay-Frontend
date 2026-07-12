"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  CreditCard,
  RefreshCcw,
  Plus,
  Zap,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Copy,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { usePayments, useSettlements, type ApiPayment } from '@/lib/api/hooks';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';
import RevenueChart from '@/components/charts/RevenueChart';

type Transaction = ApiPayment;

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const notify = useNotify();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { isLoading: settlementsLoading } = useSettlements();

  const isLoading = paymentsLoading || settlementsLoading;

  const recentTxs = payments.slice(0, 5);

  const [activePeriod, setActivePeriod] = useState<Period>('7D');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Error simulation states
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [activityError, setActivityError] = useState(false);
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
    setActivityError(nextState);
    setLinksError(nextState);
  };

  return (
    <div className="space-y-8 pb-8">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
      {/* ── Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
            Merchant Dashboard
          </p>
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            Good day, {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening with your BettaPay account today.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

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

        {/* Revenue Chart */}
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Revenue Over Time</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">USDC received to your merchant wallet</p>
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
                  onRetry={() => setChartError(false)}
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
              <div className="ml-auto flex items-center gap-1 text-success text-xs font-semibold bg-success/10 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +18.4% WoW
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Recent Activity</CardTitle>
              <Link href="/transactions">
                <Button
                  variant="ghost"
                  className="text-xs text-primary hover:text-primary hover:bg-primary/10 min-h-[44px] px-2 rounded-lg font-semibold"
                >
                  View all <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {activityError ? (
              <div className="py-8">
                <ErrorDisplay
                  message="Failed to load recent activity"
                  onRetry={() => setActivityError(false)}
                />
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted transition-colors group cursor-pointer"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Zap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.source ?? 'Payment'}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {(tx.payerAddress ?? '').slice(0, 8)}... · {new Date(tx.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn(
                        'text-sm font-semibold',
                        tx.status === 'failed' || tx.status === 'FAILED' ? 'text-destructive' : 'text-success'
                      )}>
                        {tx.status === 'failed' || tx.status === 'FAILED' ? '-' : '+'}<CurrencyDisplay amount={tx.amountUsdc} showDecimals={false} />
                      </span>
                      <StatusBadge status={tx.status as 'completed' | 'pending' | 'failed'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
                {payments.slice(0, 3).map((link) => {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
                  const linkUrl = `${baseUrl}/pay/${link.id}`;
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
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: '50%' }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">—</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-foreground">{link.converted}</span>
                        <span className="text-xs text-muted-foreground">{link.clicks} clicks</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" aria-label="Copy payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopy(`https://${link.url}`); }}>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Open payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`https://${link.url}`, '_blank'); }}>
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

          <TransactionDetail
            transaction={selectedTx}
            isOpen={!!selectedTx}
            onClose={() => setSelectedTx(null)}
          />
        </>
      )}
    </div>
  );
}

