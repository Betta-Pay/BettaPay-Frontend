"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  PRICING_TIERS,
  DEFAULT_AVG_TRANSACTION,
  DEFAULT_VOLUME,
  clampVolume,
  estimateMonthlyCost,
  formatUsd,
  formatUsdCompact,
  recommendTier,
  sliderToVolume,
  volumeToSlider,
} from '@/lib/pricing';

const AVG_TRANSACTION_OPTIONS = [10, 25, 50, 100, 250, 500];

export function VolumeCalculator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialVolume = clampVolume(Number(searchParams.get('volume')) || DEFAULT_VOLUME);
  const [volume, setVolume] = useState(initialVolume);
  const [avgTransaction, setAvgTransaction] = useState(DEFAULT_AVG_TRANSACTION);

  // Persist volume in the URL (?volume=50000), debounced to avoid history spam
  const urlTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    urlTimer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('volume', String(volume));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(urlTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  const recommended = recommendTier(volume);
  const costs = useMemo(
    () =>
      PRICING_TIERS.map((tier) => ({
        tier,
        cost: estimateMonthlyCost(tier, volume, avgTransaction),
      })),
    [volume, avgTransaction]
  );
  const starterCost = costs.find((c) => c.tier.id === 'starter')?.cost ?? null;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
      <div className="grid lg:grid-cols-2 gap-10">
        {/* Inputs */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Estimated monthly volume
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-foreground" aria-live="polite">
            {formatUsdCompact(volume)}
            <span className="text-base font-medium text-muted-foreground"> / month</span>
          </p>

          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={volumeToSlider(volume)}
            onChange={(e) => setVolume(sliderToVolume(Number(e.target.value)))}
            aria-label="Monthly transaction volume in US dollars"
            aria-valuetext={`${formatUsdCompact(volume)} per month`}
            className="mt-6 w-full h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>$1k</span>
            <span>$10M</span>
          </div>

          <div className="mt-8">
            <Label htmlFor="avg-transaction" className="text-sm font-medium text-foreground">
              Average transaction size
            </Label>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-labelledby="avg-transaction">
              {AVG_TRANSACTION_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setAvgTransaction(size)}
                  aria-pressed={avgTransaction === size}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                    avgTransaction === size
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-muted-foreground hover:border-primary/40'
                  )}
                >
                  ${size}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              ≈ {Math.round(volume / avgTransaction).toLocaleString()} transactions per month
            </p>
          </div>
        </div>

        {/* Per-tier cost */}
        <div className="space-y-3">
          {costs.map(({ tier, cost }) => {
            const isRecommended = tier.id === recommended;
            const savings =
              starterCost != null && cost != null && tier.id !== 'starter' ? starterCost - cost : null;
            return (
              <div
                key={tier.id}
                className={cn(
                  'flex items-center justify-between gap-4 p-4 rounded-xl border transition-colors',
                  isRecommended ? 'border-primary bg-primary/5' : 'border-border'
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {tier.name}
                    {isRecommended && (
                      <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.transactionFee} per transaction</p>
                </div>
                <div className="text-right">
                  {cost != null ? (
                    <>
                      <p className="text-lg font-bold text-foreground">{formatUsd(cost)}</p>
                      {savings != null && savings > 0 && (
                        <p className="text-xs text-emerald-600 flex items-center justify-end gap-1">
                          <TrendingDown className="w-3 h-3" />
                          Save {formatUsd(savings)} vs Starter
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">Contact sales</p>
                  )}
                </div>
              </div>
            );
          })}

          <Link
            href={recommended === 'enterprise' ? '/contact?subject=enterprise-pricing' : '/auth/register'}
            className="block pt-2"
          >
            <Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl">
              {recommended === 'enterprise' ? 'Contact Sales' : 'Get Started'}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Estimates only. Actual fees are calculated per transaction at settlement.
          </p>
        </div>
      </div>
    </div>
  );
}
