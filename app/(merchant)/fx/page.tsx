"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, TrendingUp, TrendingDown, Info, Bell, BellRing, Trash2, Plus } from 'lucide-react';
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
            notify.info(`Rate alert triggered: ${alert.pair} is ${alert.condition} ₦${alert.target.toLocaleString()}. Current rate: ₦1,550`);
            
            // Disable alert after triggering once to avoid spamming
            setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, enabled: false } : a));
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [alerts, notify]);

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
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Market Data</p>
          <h1 className="text-3xl font-bold text-foreground">FX Rates</h1>
          <p className="text-muted-foreground text-sm mt-1">Live exchange rates powering your USDC → NGN settlements.</p>
        </div>
        <Button variant="outline" className="border-border rounded-xl h-10 px-4 text-sm font-semibold text-muted-foreground">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="relative overflow-hidden border border-border bg-card shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Primary Rate · USDC/NGN</p>
              <p className="text-3xl sm:text-5xl font-bold text-foreground">₦1,550</p>
              <p className="text-muted-foreground text-sm mt-1">Updated {lastRefresh}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-success/10 border border-success/30 px-4 py-2 rounded-xl">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-success font-bold text-sm">+1.6% today</span>
              </div>
              <div className="bg-muted px-4 py-2 rounded-xl">
                <p className="text-xs text-muted-foreground">24h Range</p>
                <p className="text-sm font-bold text-foreground">₦1,510 – ₦1,565</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">USDC/NGN — 7 Day Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <FxRateChart height={240} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">All Pairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pairs.map((pair) => (
                <div key={`${pair.from}-${pair.to}`} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {pair.from.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pair.from}/{pair.to}</p>
                      <p className="text-xs text-muted-foreground">{pair.rate}</p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                    pair.trend === 'up' ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
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
        <Card className="border border-border bg-card shadow-sm h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Create Rate Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Currency Pair</label>
                <Select value={newPair} onValueChange={(value) => value && setNewPair(value)}>
                  <SelectTrigger className="h-10 border-border rounded-xl bg-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC/NGN">USDC/NGN</SelectItem>
                    <SelectItem value="XLM/NGN">XLM/NGN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Condition</label>
                <Select value={newCondition} onValueChange={(value) => value && setNewCondition(value as RateAlert['condition'])}>
                  <SelectTrigger className="h-10 border-border rounded-xl bg-muted">
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
              <label className="text-xs font-semibold text-foreground">Target Rate (₦)</label>
              <div className="relative">
                <Input 
                  type="number"
                  placeholder="e.g. 1600"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="h-10 pl-8 border-border rounded-xl bg-muted"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold mt-0.5">₦</span>
              </div>
            </div>
            <Button 
              onClick={handleCreateAlert}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Alert
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No active rate alerts</p>
                <p className="text-xs text-muted-foreground mt-1">We&apos;ll notify you when rates hit your targets.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all",
                    alert.enabled ? "bg-card border-border" : "bg-muted border-transparent opacity-60"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        alert.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <BellRing className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {alert.pair} {alert.condition} ₦{alert.target.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
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
                          alert.enabled ? "text-success hover:text-success hover:bg-success/10" : "text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => toggleAlert(alert.id)}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        aria-label="Delete alert"
                        className="min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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

      <Card className="border border-info/30 bg-info/10/50">
        <CardContent className="flex items-start gap-3 p-3 sm:p-5">
          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs sm:text-sm font-semibold text-info">Rates sourced from SEP-24 Anchor</p>
            <p className="text-xs text-info mt-0.5">Exchange rates are fetched in real-time from the BettaPay SEP-24 compliant anchor and may vary at the time of settlement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
