"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, TrendingUp, TrendingDown, Info, Bell, BellRing, Trash2, Plus, ArrowRight, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotify } from '@/lib/hooks/useNotify';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';

const FxRateChart = dynamic(() => import('@/components/charts/FxRateChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-full rounded-xl" />,
});

const pairs = [
  { from: 'USDC', to: 'NGN', rate: '₦1,550', change: +1.6, trend: 'up' },
  { from: 'XLM', to: 'NGN', rate: '₦324.5', change: -0.8, trend: 'down' },
  { from: 'USDC', to: 'XLM', rate: '4.78 XLM', change: +2.3, trend: 'up' },
];

interface RateAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  target: number;
  enabled: boolean;
}

export default function FxRatesPage() {
  const [lastRefresh] = useState('Just now');
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const notify = useNotify();
  const [newPair, setNewPair] = useState('USDC/NGN');
  const [newCondition, setNewCondition] = useState<'above' | 'below'>('above');
  const [newTarget, setNewTarget] = useState('');

  // Load alerts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bettapay_rate_alerts');
    if (saved) {
      try {
        setAlerts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse alerts', e);
      }
    }
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('bettapay_rate_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Simulate rate checking
  useEffect(() => {
    const currentRate = 1550; // Current mock rate
    const interval = setInterval(() => {
      alerts.forEach(alert => {
        if (alert.enabled) {
          const isTriggered = alert.condition === 'above' 
            ? currentRate >= alert.target 
            : currentRate <= alert.target;
          
          if (isTriggered) {
            notify.info('Rate Alert Triggered!', {
              description: `${alert.pair} is ${alert.condition} ₦${alert.target.toLocaleString()}. Current rate: ₦1,550`,
              icon: <BellRing className="w-4 h-4 text-amber-500" />,
              duration: 5000,
            });
            
            // Disable alert after triggering once to avoid spamming
            setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: false } : a));
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [alerts]);

  const handleCreateAlert = () => {
    if (!newTarget || isNaN(Number(newTarget))) {
      notify.error('Please enter a valid target rate');
      return;
    }

    const alert: RateAlert = {
      id: Math.random().toString(36).substr(2, 9),
      pair: newPair,
      condition: newCondition,
      target: Number(newTarget),
      enabled: true,
    };

    setAlerts([...alerts, alert]);
    setNewTarget('');
    notify.success('Rate alert created');
  };

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id));
    notify.info('Alert removed');
  };

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
            <FxRateChart height={240} />
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

      {/* Rate Alerts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200 bg-white shadow-sm h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Create Rate Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Currency Pair</label>
                <Select value={newPair} onValueChange={setNewPair}>
                  <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC/NGN">USDC/NGN</SelectItem>
                    <SelectItem value="XLM/NGN">XLM/NGN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Condition</label>
                <Select value={newCondition} onValueChange={(v: any) => setNewCondition(v)}>
                  <SelectTrigger className="h-10 border-slate-200 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Goes Above</SelectItem>
                    <SelectItem value="below">Goes Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Target Rate (₦)</label>
              <div className="relative">
                <Input 
                  type="number"
                  placeholder="e.g. 1600"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="h-10 pl-8 border-slate-200 rounded-xl bg-slate-50"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold mt-0.5">₦</span>
              </div>
            </div>
            <Button 
              onClick={handleCreateAlert}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Alert
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-400">No active rate alerts</p>
                <p className="text-xs text-slate-400 mt-1">We'll notify you when rates hit your targets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    alert.enabled ? "bg-white border-slate-100" : "bg-slate-50 border-transparent opacity-60"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        alert.enabled ? "bg-amber-50 text-amber-600" : "bg-slate-200 text-slate-500"
                      )}>
                        <BellRing className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {alert.pair} {alert.condition} ₦{alert.target.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {alert.enabled ? 'Monitoring' : 'Paused'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label={alert.enabled ? "Disable alert" : "Enable alert"}
                        className={cn(
                          "min-h-[44px] min-w-[44px] rounded-lg",
                          alert.enabled ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                        )}
                        onClick={() => toggleAlert(alert.id)}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label="Delete alert"
                        className="min-h-[44px] min-w-[44px] rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
