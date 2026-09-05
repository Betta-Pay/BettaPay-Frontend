"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { Sliders, Bell, Shield, Gauge } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';

const POLL_RATES = [
  { label: '1 second (Aggressive)', value: 1000 },
  { label: '2 seconds (Fast)', value: 2000 },
  { label: '3 seconds (Recommended)', value: 3000 },
  { label: '5 seconds (Standard)', value: 5000 },
  { label: '10 seconds (Eco)', value: 10000 },
];

export default function AdminSettingsPage() {
  const notify = useNotify();
  const [selectedRate, setSelectedRate] = useState<number>(3000);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bettapay:admin:ticker_rate');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setSelectedRate(parsed);
        }
      }
    }
  }, []);

  const handleSaveRate = (rateMs: number) => {
    setSelectedRate(rateMs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bettapay:admin:ticker_rate', rateMs.toString());
    }
    notify.success(`Real-time ticker update rate set to ${rateMs / 1000}s`);
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="System Controls"
        title="Admin Settings & Performance"
        description="Configure real-time polling rates, ticker settings, and administrative defaults."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Real-time Ticker Update Rate Controls */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Live Ticker Refresh Rate</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control how frequently the real-time platform volume ticker polls for new metrics.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {POLL_RATES.map((rate) => (
              <div
                key={rate.value}
                onClick={() => handleSaveRate(rate.value)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedRate === rate.value
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <span className="text-sm">{rate.label}</span>
                {selectedRate === rate.value && (
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/20">
                    Active
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Diagnostics & Preferences */}
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Admin Preferences</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  System telemetry and notification alert thresholds.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Compliance Alerts</p>
                  <p className="text-xs text-muted-foreground">Notify when pending KYB reviews exceed 5</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">
                Enabled
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reduced Motion Default</p>
                  <p className="text-xs text-muted-foreground">Respect browser prefers-reduced-motion for ticker animations</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">
                Auto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
