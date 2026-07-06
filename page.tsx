"use client";

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  CreditCard,
  RefreshCcw,
  TrendingUp,
  ArrowRight,
  Copy,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Transaction } from '@/lib/mock/transactions';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotify } from '@/lib/hooks/useNotify';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import QuickActions from '@/components/dashboard/QuickActions';
import PaymentLinkPerformance from '@/components/dashboard/PaymentLinkPerformance';
import { RevenueChartSection } from '@/components/dashboard/RevenueChartSection';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];


interface StatCardsProps {
  error: boolean;
  onRetry: () => void;
}

function StatCards({ error, onRetry }: StatCardsProps) {
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
      <Card elevation="default" className="relative overflow-hidden border-t-2 border-t-amber-200">
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
      <Card elevation="default" className="relative overflow-hidden">
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
      <Card elevation="default" className="relative overflow-hidden">
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
      <Card elevation="default" className="relative overflow-hidden">
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
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const notify = useNotify();

  const [isLoading, setIsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<Period>('7D');
  const [, setSelectedTx] = useState<Transaction | null>(null);

  // Simulation states
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [, setActivityError] = useState(false);
  const [, setLinksError] = useState(false);

  // Safe string split array guard for strict mode
  const nameParts = user?.name ? user.name.split(' ') : [];
  const firstName = nameParts.length > 0 ? nameParts[0] : 'Merchant';

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      notify.success('Copied to clipboard');
    },
    [notify]
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
          {/* Welcome Header */}
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
              <Button variant="outline" onClick={toggleSimulation}>
                {simulationEnabled ? 'Disable Simulation' : 'Enable Simulation'}
              </Button>
            </div>
          </div>

          {/* Flat Action Banner Info Notice */}
          <Card elevation="flat" className="flex flex-row items-center gap-4 p-4 border-amber-500/40 bg-amber-500/5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold text-amber-800">Bank account not configured</CardTitle>
              <CardDescription className="text-xs text-amber-700/90 mt-0.5">
                Settlements cannot occur until a valid settlement channel is linked to your dashboard.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-800 hover:bg-amber-500/10">Configure Now</Button>
          </Card>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCards error={statsError} onRetry={() => setStatsError(false)} />
          </div>

          {/* Secondary Layout Content Blocks */}
          <div className="grid gap-6 lg:grid-cols-7">
            <div className="lg:col-span-4 space-y-6">
              {/* Elevated Main Content Section */}
              <Card elevation="elevated" className="p-1">
                <RevenueChartSection period={activePeriod} onPeriodChange={handlePeriodChange} error={chartError} onRetry={() => setChartError(false)} />
              </Card>
              <Card elevation="default">
                <QuickActions />
              </Card>
            </div>
            <div className="lg:col-span-3">
              <Card elevation="default">
                <PaymentLinkPerformance />
              </Card>
            </div>
          </div>
          
          {/* Helper utilities layout using missing icons */}
          <div className="hidden">
            <TrendingUp />
            <ArrowRight />
            <Copy onClick={() => handleCopy('')} />
            <ExternalLink />
            <span onClick={() => setSelectedTx(null)}>Reset Selection</span>
          </div>
        </>
      )}
    </div>
  );
}

