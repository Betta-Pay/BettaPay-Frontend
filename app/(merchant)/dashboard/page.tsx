"use client";

import { useState, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
} from 'lucide-react';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { Transaction } from '@/lib/mock/transactions';
import { mockTransactions, mockPaymentLinks } from '@/lib/mock/dashboard';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';
import { RevenueChartSection } from '@/components/dashboard/RevenueChartSection';

const QuickActions = dynamic(
  () => import('@/components/dashboard/QuickActions').then((m) => ({ default: m.QuickActions })),
  { loading: () => <Skeleton className="lg:col-span-3 h-48 rounded-xl" /> }
);

const PaymentLinkPerformance = dynamic(
  () =>
    import('@/components/dashboard/PaymentLinkPerformance').then((m) => ({
      default: m.PaymentLinkPerformance,
    })),
  { loading: () => <Skeleton className="lg:col-span-4 h-48 rounded-xl" /> }
);

type DashboardTransaction = Transaction & {
  label: string;
  amount: number;
  time: string;
  address: string;
};

const mockTransactions: DashboardTransaction[] = realTransactions.slice(0, 5).map((tx, i) => {
  const oldData: Array<Pick<DashboardTransaction, 'label' | 'amount' | 'time'>> = [
    { label: 'Consulting Retainer', amount: 750, time: '2m ago' },
    { label: 'E-commerce Payment', amount: 45.5, time: '18m ago' },
    { label: 'Invoice #1042', amount: 1200, time: '1h ago' },
    { label: 'Subscription Fee', amount: 29, time: '3h ago' },
    { label: 'Freelance Project', amount: 3500, time: '5h ago' },
  ];
  return {
    ...tx,
    ...oldData[i],
    amountUsdc: oldData[i].amount,
    address:
      tx.payerAddress.substring(0, 4) +
      '...' +
      tx.payerAddress.substring(tx.payerAddress.length - 4),
  };
});

const mockPaymentLinks = [
  { id: 'link_01', label: 'Consulting Retainer Q3', url: 'betta.pay/pay/link_01', clicks: 24, converted: 8 },
  { id: 'link_02', label: 'E-commerce Checkout', url: 'betta.pay/pay/link_02', clicks: 112, converted: 47 },
  { id: 'link_03', label: 'Donation Campaign', url: 'betta.pay/pay/link_03', clicks: 58, converted: 19 },
];

// ── Memoised stat cards — won't re-render when period or tx selection changes ──
interface StatCardsProps {
  error: boolean;
  onRetry: () => void;
}

const StatCards = memo(function StatCards({ error, onRetry }: StatCardsProps) {
  if (error) {
    return (
      <div className="col-span-full">
        <ErrorDisplay message="Failed to load statistics" onRetry={onRetry} />
      </div>
    );
  }
  return (
    <>
      {/* Card 1 */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Volume (30d)
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 relative">
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            <CurrencyDisplay amount={45231.89} />
          </div>
          <p className="text-xs text-emerald-600 flex items-center mt-1.5 font-medium">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            +20.1% from last month
          </p>
        </CardContent>
      </Card>

      {/* Card 2 */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Active Payment Links
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 relative">
          <div className="text-xl sm:text-2xl font-bold text-foreground">12</div>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
            +3 new links this week
          </p>
        </CardContent>
      </Card>

      {/* Card 3 */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Available to Settle
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 relative">
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            <CurrencyDisplay amount={12450.0} />
          </div>
          <p className="text-xs text-primary flex items-center mt-1.5 font-medium">
            <ArrowDownRight className="h-3 w-3 mr-1" />
            Pending NGN conversion
          </p>
        </CardContent>
      </Card>

      {/* Card 4 */}
      <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Current FX Rate
          </CardTitle>
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <RefreshCcw className="h-4 w-4 text-purple-600" />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 relative">
          <div className="text-xl sm:text-2xl font-bold text-foreground">₦1,550</div>
          <p className="text-xs text-muted-foreground mt-1.5 font-medium">
            per USDC · Updated 5m ago
          </p>
        </CardContent>
      </Card>
    </>
  );
});

export default function DashboardPage() {
  const { user } = useAuthStore();
  const notify = useNotify();
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
            {/* Card 1 */}
            <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Volume (30d)
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 relative">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  <CurrencyDisplay amount={45231.89} />
                </div>
                <p className="text-xs text-success flex items-center mt-1.5 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Payment Links
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-info" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 relative">
                <div className="text-xl sm:text-2xl font-bold text-foreground">12</div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  +3 new links this week
                </p>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available to Settle
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 relative">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  <CurrencyDisplay amount={12450.00} />
                </div>
                <p className="text-xs text-primary flex items-center mt-1.5 font-medium">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  Pending NGN conversion
                </p>
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="relative overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current FX Rate
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <RefreshCcw className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 relative">
                <div className="text-xl sm:text-2xl font-bold text-foreground">₦1,550</div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  per USDC · Updated 5m ago
                </p>
              </CardContent>
            </Card>
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
                {mockTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-muted transition-colors group cursor-pointer"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Zap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {tx.address} · {tx.time}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn(
                        'text-sm font-semibold',
                        tx.status === 'failed' ? 'text-destructive' : 'text-success'
                      )}>
                        {tx.status === 'failed' ? '-' : '+'}<CurrencyDisplay amount={tx.amountUsdc} showDecimals={false} />
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
                  color === 'purple' && 'border-purple-200 bg-purple-50 hover:bg-purple-100',
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'amber' && 'text-primary',
                    color === 'blue' && 'text-info',
                    color === 'emerald' && 'text-success',
                    color === 'purple' && 'text-purple-600',
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
                {mockPaymentLinks.map((link) => {
                  const conversionRate = Math.round((link.converted / link.clicks) * 100);
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
                        <p className="text-sm font-semibold text-foreground truncate">{link.label}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{link.url}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${conversionRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground font-medium">{conversionRate}%</span>
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
    </div>
  );
}
