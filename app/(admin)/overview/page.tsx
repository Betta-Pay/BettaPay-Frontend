"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { Users, AlertTriangle, ArrowUpRight, Activity, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PlatformVolumeChart = dynamic(() => import('@/components/charts/PlatformVolumeChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
});

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor system health, total volume, and compliance alerts.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed (30d)</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 z-10 relative">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              <CurrencyDisplay amount={1452310.89} />
            </div>
            <p className="text-xs text-success flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              <CurrencyDisplay amount={14523.10} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              1.0% flat fee across volume
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Merchants</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">142</div>
            <p className="text-xs text-success flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12 new this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Pending KYB Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-destructive">8</div>
            <p className="text-xs text-destructive/80 mt-1">
              Requires immediate action
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4 bg-card border shadow-sm">
          <CardHeader>
            <CardTitle>Platform Volume vs Fees</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="mt-4">
              <PlatformVolumeChart height={300} />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card border shadow-sm">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">Stellar Horizon API</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">14ms ping</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">Soroban RPC</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">42ms ping</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <div>
                    <p className="text-sm font-medium">SEP-24 Anchor (NGN)</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">Syncing</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div>
                    <p className="text-sm font-medium">PostgreSQL Database</p>
                    <p className="text-xs text-muted-foreground">High Load</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-warning">82% CPU</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
