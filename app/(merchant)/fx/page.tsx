"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

const fxHistory = [
  { date: 'Jan 7', rate: 1480 },
  { date: 'Jan 8', rate: 1495 },
  { date: 'Jan 9', rate: 1510 },
  { date: 'Jan 10', rate: 1505 },
  { date: 'Jan 11', rate: 1520 },
  { date: 'Jan 12', rate: 1545 },
  { date: 'Jan 13', rate: 1550 },
];

const pairs = [
  { from: 'USDC', to: 'NGN', rate: '₦1,550', change: +1.6, trend: 'up' },
  { from: 'XLM', to: 'NGN', rate: '₦324.5', change: -0.8, trend: 'down' },
  { from: 'USDC', to: 'XLM', rate: '4.78 XLM', change: +2.3, trend: 'up' },
];

interface FxTooltipProps { active?: boolean; payload?: { value: number }[]; label?: string; }
const FxTooltip = ({ active, payload, label }: FxTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-amber-600 font-bold">₦{payload[0]?.value?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function FxRatesPage() {
  const [lastRefresh] = useState('Just now');

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-1">Market Data</p>
          <h1 className="text-3xl font-bold text-slate-900">FX Rates</h1>
          <p className="text-slate-400 text-sm mt-1">Live exchange rates powering your USDC → NGN settlements.</p>
        </div>
        <Button variant="outline" className="border-slate-200 rounded-xl h-10 px-4 text-sm font-semibold text-slate-600">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary Rate · USDC/NGN</p>
              <p className="text-3xl sm:text-5xl font-bold text-slate-900">₦1,550</p>
              <p className="text-slate-400 text-sm mt-1">Updated {lastRefresh}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold text-sm">+1.6% today</span>
              </div>
              <div className="bg-slate-100 px-4 py-2 rounded-xl">
                <p className="text-xs text-slate-400">24h Range</p>
                <p className="text-sm font-bold text-slate-800">₦1,510 – ₦1,565</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">USDC/NGN — 7 Day Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fxHistory} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v}`} tick={{ fill: '#94A3B8' }} domain={['auto', 'auto']} />
                  <Tooltip content={<FxTooltip />} />
                  <Line type="monotone" dataKey="rate" stroke="#F0A500" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#F0A500', stroke: '#fff', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">All Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pairs.map((pair) => (
                <div key={`${pair.from}-${pair.to}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                      {pair.from.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{pair.from}/{pair.to}</p>
                      <p className="text-xs text-slate-400">{pair.rate}</p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                    pair.trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
                  )}>
                    {pair.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pair.change > 0 ? '+' : ''}{pair.change}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 p-3 sm:p-5">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-blue-800">Rates sourced from SEP-24 Anchor</p>
            <p className="text-xs text-blue-600 mt-0.5">Exchange rates are fetched in real-time from the BettaPay SEP-24 compliant anchor and may vary at the time of settlement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
