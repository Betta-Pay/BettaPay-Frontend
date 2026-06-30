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
      <Card className="relative overflow-hidden border border-border border-t-2 border-t-amber-200 bg-card shadow-sm hover:shadow-md transition-shadow">
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
        <StatCards error={statsError} onRetry={() => setStatsError(false)} />
      </div>

      {/* ── Charts + Recent Transactions ── */}
      <div className="grid gap-6 lg:grid-cols-7">

        {/* Revenue Chart — period toggle is internal, parent won't re-render */}
        <RevenueChartSection
          chartError={chartError}
          onRetry={() => setChartError(false)}
        />

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
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          tx.status === 'failed' ? 'text-red-500' : 'text-emerald-600'
                        )}
                      >
                        {tx.status === 'failed' ? '-' : '+'}
                        <CurrencyDisplay amount={tx.amountUsdc} showDecimals={false} />
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
        <QuickActions />
        <PaymentLinkPerformance
          links={mockPaymentLinks}
          error={linksError}
          onRetry={() => setLinksError(false)}
          onCopy={(url) => handleCopy(url)}
        />
      </div>

      <TransactionDetail
        transaction={selectedTx}
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
}
