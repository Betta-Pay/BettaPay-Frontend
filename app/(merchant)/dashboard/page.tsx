"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Copy,
  ExternalLink,
  TrendingUp,
  Zap,
  ChevronRight,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { TransactionDetail } from '@/components/transactions/TransactionDetail';
import { Transaction, mockTransactions as realTransactions } from '@/lib/mock/transactions';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import { useNotify } from '@/lib/hooks/useNotify';
import { cn } from '@/lib/utils';

const notify = useNotify();

const mockChartData = [
  { name: 'Mon', total: 1200, volume: 8400 },
  { name: 'Tue', total: 2100, volume: 14700 },
  { name: 'Wed', total: 1800, volume: 12600 },
  { name: 'Thu', total: 3200, volume: 22400 },
  { name: 'Fri', total: 2800, volume: 19600 },
  { name: 'Sat', total: 4100, volume: 28700 },
  { name: 'Sun', total: 3800, volume: 26600 },
];

const mockTransactions = realTransactions.slice(0, 5).map((tx, i) => {
  const oldData = [
    { label: 'Consulting Retainer', amount: 750, time: '2m ago' },
    { label: 'E-commerce Payment', amount: 45.5, time: '18m ago' },
    { label: 'Invoice #1042', amount: 1200, time: '1h ago' },
    { label: 'Subscription Fee', amount: 29, time: '3h ago' },
    { label: 'Freelance Project', amount: 3500, time: '5h ago' },
  ];
  return {
    ...tx,
    ...oldData[i],
    amountUsdc: oldData[i].amount, // Ensure amountUsdc matches what Dashboard expects now
    address: tx.payerAddress.substring(0, 4) + '...' + tx.payerAddress.substring(tx.payerAddress.length - 4),
  };
});

const mockPaymentLinks = [
  { id: 'link_01', label: 'Consulting Retainer Q3', url: 'betta.pay/pay/link_01', clicks: 24, converted: 8 },
  { id: 'link_02', label: 'E-commerce Checkout', url: 'betta.pay/pay/link_02', clicks: 112, converted: 47 },
  { id: 'link_03', label: 'Donation Campaign', url: 'betta.pay/pay/link_03', clicks: 58, converted: 19 },
];

const PERIOD_OPTIONS = ['7D', '30D', '90D'] as const;
type Period = typeof PERIOD_OPTIONS[number];

// Custom Tooltip for recharts
interface TooltipProps { active?: boolean; payload?: { value: number }[]; label?: string; }
const ChartTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-amber-600 font-bold">${payload[0]?.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [activePeriod, setActivePeriod] = useState<Period>('7D');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Error simulation states
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [linksError, setLinksError] = useState(false);

  const firstName = user?.name?.split(' ')[0] ?? 'Merchant';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.success('Copied to clipboard');
  };

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
          <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">
            Merchant Dashboard
          </p>
          <h1 className="text-3xl font-bold text-slate-900 leading-tight">
            Good day, {firstName} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here&apos;s what&apos;s happening with your BettaPay account today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={cn(
              "rounded-xl h-10 px-4 text-sm transition-all border",
              simulationEnabled
                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
            onClick={toggleSimulation}
          >
            {simulationEnabled ? "Reset API" : "Simulate API Error"}
          </Button>
          <Link href="/payments">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl h-10 px-4 text-sm shadow-sm shadow-amber-200 transition-all">
              <Plus className="w-4 h-4 mr-2" />
              New Payment Link
            </Button>
          </Link>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Volume (30d)
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-slate-900">
                  <CurrencyDisplay amount={45231.89} />
                </div>
                <p className="text-xs text-emerald-600 flex items-center mt-1.5 font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +20.1% from last month
                </p>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Payment Links
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-slate-900">12</div>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">
                  +3 new links this week
                </p>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Available to Settle
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-slate-900">
                  <CurrencyDisplay amount={12450.00} />
                </div>
                <p className="text-xs text-amber-500 flex items-center mt-1.5 font-medium">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  Pending NGN conversion
                </p>
              </CardContent>
            </Card>

            {/* Card 4 */}
            <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/60 to-transparent pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Current FX Rate
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <RefreshCcw className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-slate-900">₦1,550</div>
                <p className="text-xs text-slate-400 mt-1.5 font-medium">
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
        <Card className="lg:col-span-4 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Revenue Over Time</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">USDC received to your merchant wallet</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePeriod(p)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                      activePeriod === p
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
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
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F0A500" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#CBD5E1"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#94A3B8' }}
                    />
                    <YAxis
                      stroke="#CBD5E1"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fill: '#94A3B8' }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#F0A500"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#F0A500', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            {/* Summary row */}
            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 mt-2">
              <div>
                <p className="text-xs text-slate-400">Peak day</p>
                <p className="text-sm font-semibold text-slate-900">Saturday · $4,100</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Weekly avg</p>
                <p className="text-sm font-semibold text-slate-900">$2,714</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +18.4% WoW
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-3 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Activity</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 rounded-lg font-semibold">
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
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTx(tx as any)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                      <Zap className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{tx.label}</p>
                      <p className="text-xs text-slate-400 font-mono">{tx.address} · {tx.time}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn(
                        'text-sm font-semibold',
                        tx.status === 'failed' ? 'text-red-500' : 'text-emerald-600'
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
        <Card className="lg:col-span-3 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle>
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
                  color === 'amber' && 'border-amber-200 bg-amber-50 hover:bg-amber-100',
                  color === 'blue' && 'border-blue-200 bg-blue-50 hover:bg-blue-100',
                  color === 'emerald' && 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100',
                  color === 'purple' && 'border-purple-200 bg-purple-50 hover:bg-purple-100',
                )}>
                  <Icon className={cn(
                    'w-5 h-5',
                    color === 'amber' && 'text-amber-600',
                    color === 'blue' && 'text-blue-600',
                    color === 'emerald' && 'text-emerald-600',
                    color === 'purple' && 'text-purple-600',
                  )} />
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{label}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Payment Link Performance */}
        <Card className="lg:col-span-4 border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Payment Link Performance</CardTitle>
              <Link href="/payments">
                <Button variant="ghost" className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 px-2 rounded-lg font-semibold">
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
                    <div key={link.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{link.label}</p>
                        <p className="text-xs text-slate-400 font-mono truncate">{link.url}</p>
                        {/* Conversion bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${conversionRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{conversionRate}%</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-slate-900">{link.converted}</span>
                        <span className="text-xs text-slate-400">{link.clicks} clicks</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" aria-label="Copy payment link" className="h-7 w-7 rounded-lg" onClick={() => handleCopy(`https://${link.url}`)}>
                          <Copy className="w-3 h-3 text-slate-400" />
                        </Button>
                        <Link href={`https://${link.url}`} target="_blank">
                          <Button variant="ghost" size="icon" aria-label="Open payment link" className="h-7 w-7 rounded-lg">
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </Button>
                        </Link>
                      </div>
                    </div>
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
