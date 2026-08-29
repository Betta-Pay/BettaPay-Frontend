import React from 'react';
import { Toggle } from "@/components/ui";
import type { OnboardingData } from "@/app/onboarding/page";
import { useRates } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { SUPPORTED_SETTLEMENT_CURRENCIES } from "@/lib/utils/constants";

type Props = {
  data: OnboardingData;
  errors: Record<string, string>;
  onChange: (data: Partial<OnboardingData>) => void;
};


export function StepCurrency({ data, errors, onChange }: Props) {
  const { data: rates, isLoading: ratesLoading, primaryRate } = useRates();

  const getRateText = (currency: string) => {
    if (currency === 'NGN') return null;

    // For USDC, look up USDC/NGN (standard primary rate)
    if (currency === 'USDC') {
      const usdcNgn = primaryRate || rates?.find((r) => r.from === 'USDC' && r.to === 'NGN')?.rate;
      if (usdcNgn) return `₦${Number(usdcNgn).toLocaleString()}`;
    }

    // For any other currency (like XLM, USD, ZAR, GHS, KES, etc.), check if there is an active pair to NGN
    const matchingRate = rates?.find((r) => r.from === currency && r.to === 'NGN')?.rate;
    if (matchingRate) {
      return `₦${Number(matchingRate).toLocaleString()}`;
    }

    return null;
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Default settlement currency</h2>
        <p className="text-sm text-muted-foreground">Choose the currency you want to receive by default.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SUPPORTED_SETTLEMENT_CURRENCIES.map((currency) => {
          const rateText = getRateText(currency);

          return (
            <button
              key={currency}
              type="button"
              onClick={() => onChange({ settlementCurrency: currency })}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border p-4 font-medium transition-all text-center min-h-[72px]",
                data.settlementCurrency === currency
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/50 text-foreground"
              )}
            >
              {currency === 'NGN' && (
                <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
                  Recommended
                </span>
              )}
              <span className="text-sm font-semibold">{currency}</span>
              {ratesLoading ? (
                <span className="text-[10px] text-muted-foreground/60 animate-pulse mt-0.5">
                  Fetching rate...
                </span>
              ) : (
                rateText && (
                  <span className="text-[11px] text-muted-foreground mt-0.5 font-normal">
                    1 {currency} = {rateText}
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      {errors.settlementCurrency && (
        <p className="text-sm text-destructive">{errors.settlementCurrency}</p>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="font-medium">Auto-convert payments</p>
          <p className="text-sm text-muted-foreground">Convert incoming USDC to your default currency automatically.</p>
        </div>
        <Toggle
          checked={data.autoConvert}
          label="Auto-convert payments"
          onClick={() => onChange({ autoConvert: !data.autoConvert })}
        />
      </div>
    </section>
  );
}
