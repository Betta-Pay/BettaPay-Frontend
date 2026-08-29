"use client";

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, DollarSign, Users, Zap, SlidersHorizontal } from 'lucide-react';
import { usePlatformTicker } from '@/lib/hooks/usePlatformTicker';
import { CurrencyDisplay } from '@/components/shared';
import { Card, CardContent } from '@/components/ui';
import Link from 'next/link';

interface PlatformTickerProps {
  defaultPollIntervalMs?: number;
  className?: string;
}

export function PlatformTicker({ defaultPollIntervalMs = 3000, className }: PlatformTickerProps) {
  const [pollRate, setPollRate] = useState<number>(defaultPollIntervalMs);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bettapay:admin:ticker_rate');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setPollRate(parsed);
        }
      }
    }
  }, []);

  const { ticker, isFetching } = usePlatformTicker(pollRate);

  const animationVariant = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, ease: 'easeOut' } };

  return (
    <Card className={`border border-primary/20 bg-card/80 backdrop-blur shadow-sm overflow-hidden ${className ?? ''}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
          {/* Live Indicator */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
              LIVE TICKER
            </span>
            <span className="text-muted-foreground font-mono text-[10px]">
              ({pollRate / 1000}s poll)
            </span>
            {isFetching && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" title="Updating..." />
            )}
          </div>

          {/* Real-time Ticker Metrics */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 min-w-0">
            {/* Live Volume */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Real-Time Volume</p>
                <motion.div key={ticker.liveVolume} {...animationVariant} className="font-bold text-foreground text-sm">
                  <CurrencyDisplay amount={ticker.liveVolume} currency="USDC" />
                </motion.div>
              </div>
            </div>

            {/* Live Fees */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Live Fees Generated</p>
                <motion.div key={ticker.liveFees} {...animationVariant} className="font-bold text-foreground text-sm">
                  <CurrencyDisplay amount={ticker.liveFees} currency="USDC" />
                </motion.div>
              </div>
            </div>

            {/* Active Merchants */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Active Merchants</p>
                <motion.div key={ticker.activeMerchants} {...animationVariant} className="font-bold text-foreground text-sm">
                  {ticker.activeMerchants.toLocaleString()}
                </motion.div>
              </div>
            </div>

            {/* TPS / Throughput */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Throughput</p>
                <motion.div key={ticker.tps} {...animationVariant} className="font-bold text-foreground text-sm font-mono">
                  {ticker.tps} tx/s
                </motion.div>
              </div>
            </div>
          </div>

          {/* Admin Settings Link */}
          <Link href="/admin/settings" className="shrink-0 ml-auto">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Rate Controls</span>
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
