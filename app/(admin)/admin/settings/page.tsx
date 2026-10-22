"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { PageHeader } from '@/components/shared/PageHeader';
import { Sliders, Bell, Shield, Gauge, Percent, Lock, Activity, Wrench } from 'lucide-react';
import { Alert, AlertDescription, Skeleton } from '@/components/ui';
import { SettingsSectionCard, type FieldConfig } from '@/components/admin/settings/SettingsSection';
import { SettingsHistory } from '@/components/admin/settings/SettingsHistory';
import { useSettings } from '@/lib/settings/client';
import { useUnsavedGuard } from '@/lib/settings/useUnsavedGuard';
import type { SettingsSection } from '@/lib/settings/types';
import { useNotify } from '@/lib/hooks/useNotify';

const POLL_RATES = [
  { label: '1 second (Aggressive)', value: 1000 },
  { label: '2 seconds (Fast)', value: 2000 },
  { label: '3 seconds (Recommended)', value: 3000 },
  { label: '5 seconds (Standard)', value: 5000 },
  { label: '10 seconds (Eco)', value: 10000 },
];

const FEE_FIELDS: FieldConfig[] = [
  { key: 'defaultBps', label: 'Default fee (bps)', type: 'number', help: '100 bps = 1%. Applied when a merchant has no override.' },
  { key: 'capUsdc', label: 'Fee cap (USDC)', type: 'number', step: 'any', help: 'No single settlement is charged more than this.' },
  { key: 'minFeeUsdc', label: 'Minimum fee (USDC)', type: 'number', step: 'any' },
];
const AUTH_FIELDS: FieldConfig[] = [
  { key: 'ipScoreThreshold', label: 'IP score threshold', type: 'number', help: 'Requests from an IP at or above this score are rejected.' },
  { key: 'lockoutMaxFailures', label: 'Failed attempts before lockout', type: 'number' },
  { key: 'lockoutMinutes', label: 'Lockout duration (minutes)', type: 'number' },
];
const RATE_FIELDS: FieldConfig[] = [
  { key: 'globalRequestsPerMinute', label: 'Requests per minute (global)', type: 'number' },
  { key: 'burst', label: 'Burst allowance', type: 'number' },
  { key: 'windowSeconds', label: 'Window (seconds)', type: 'number' },
];
const MAINTENANCE_FIELDS: FieldConfig[] = [
  { key: 'enabled', label: 'Maintenance mode', type: 'bool', help: 'Shows the maintenance banner to merchants.' },
  { key: 'readOnlyMode', label: 'Read-only mode', type: 'bool', help: 'Blocks writes but keeps reads working.' },
  { key: 'message', label: 'Banner message', type: 'text', help: 'Up to 280 characters.' },
];

export default function AdminSettingsPage() {
  const notify = useNotify();
  const [selectedRate, setSelectedRate] = useState<number>(3000);
  const settings = useSettings();
  const [dirty, setDirty] = useState<Partial<Record<SettingsSection, boolean>>>({});
  const [simulateFailure, setSimulateFailure] = useState(false);
  const handleDirty = useCallback((section: SettingsSection, isDirty: boolean) => {
    setDirty((d) => (d[section] === isDirty ? d : { ...d, [section]: isDirty }));
  }, []);
  useUnsavedGuard(Object.values(dirty).some(Boolean));

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

      <section aria-labelledby="platform-config-heading" className="space-y-4">
        <h2 id="platform-config-heading" className="text-lg font-semibold">Platform configuration</h2>
        {process.env.NODE_ENV !== 'production' && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
            Simulate failure on next save (dev only: the save fails after the optimistic update, to show rollback)
          </label>
        )}
        {settings.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Couldn&apos;t load platform settings.{' '}
              <Button variant="outline" size="sm" onClick={() => void settings.refetch()}>Retry</Button>
            </AlertDescription>
          </Alert>
        ) : !settings.data ? (
          <div className="grid gap-6 md:grid-cols-2" role="status" aria-busy="true" aria-label="Loading settings">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <SettingsSectionCard section="fees" title="Fee configuration" description="Default platform fee and caps." icon={<Percent className="w-5 h-5" />} fields={FEE_FIELDS} server={settings.data.fees} updatedAt={settings.data.fees.updatedAt} simulateFailure={simulateFailure} onDirtyChange={handleDirty} />
            <SettingsSectionCard section="authPolicy" title="Auth policy" description="IP reputation threshold and account lockout." icon={<Lock className="w-5 h-5" />} fields={AUTH_FIELDS} server={settings.data.authPolicy} updatedAt={settings.data.authPolicy.updatedAt} simulateFailure={simulateFailure} onDirtyChange={handleDirty} />
            <SettingsSectionCard section="rateLimits" title="Rate-limit globals" description="Platform-wide request limits." icon={<Activity className="w-5 h-5" />} fields={RATE_FIELDS} server={settings.data.rateLimits} updatedAt={settings.data.rateLimits.updatedAt} simulateFailure={simulateFailure} onDirtyChange={handleDirty} />
            <SettingsSectionCard
              section="maintenance"
              title="Maintenance"
              description="Take the platform offline or read-only."
              icon={<Wrench className="w-5 h-5" />}
              fields={MAINTENANCE_FIELDS}
              server={settings.data.maintenance}
              updatedAt={settings.data.maintenance.updatedAt}
              simulateFailure={simulateFailure}
              onDirtyChange={handleDirty}
              confirmMessage={(next, prev) =>
                next.enabled !== prev.enabled || next.readOnlyMode !== prev.readOnlyMode
                  ? 'This changes what every merchant can do right now. Save the maintenance settings?'
                  : null
              }
            />
          </div>
        )}
        <SettingsHistory />
      </section>

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
