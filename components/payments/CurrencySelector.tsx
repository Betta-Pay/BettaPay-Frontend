"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { Check, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { MULTI_CURRENCY_ASSETS, MOCK_RATES } from "@/lib/utils/constants";

export interface CurrencySelectorProps {
  selectedCurrencies: string[];
  onSelectionChange: (currencies: string[]) => void;
  mode?: "single" | "multi";
  disabled?: boolean;
  className?: string;
  showRates?: boolean;
}

interface CurrencyCardProps {
  code: string;
  selected: boolean;
  rate: number | null;
  rateLoading: boolean;
  onClick: () => void;
  disabled: boolean;
  showRate: boolean;
}

const CurrencyCard = memo(function CurrencyCard({
  code,
  selected,
  rate,
  rateLoading,
  onClick,
  disabled,
  showRate,
}: CurrencyCardProps) {
  const asset = MULTI_CURRENCY_ASSETS[code];
  if (!asset) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 w-full p-3 rounded-xl border-2 transition-all text-left",
        "hover:border-primary/50 hover:bg-primary/5",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border/50 bg-background/50",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg text-lg font-bold shrink-0",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {asset.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{asset.code}</span>
          <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
        </div>
        {showRate && (
          <div className="mt-0.5">
            {rateLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : rate !== null ? (
              <span className="text-xs text-muted-foreground">
                1 {asset.code} ≈ ${rate.toFixed(4)} USD
              </span>
            ) : (
              <span className="text-xs text-destructive">Rate unavailable</span>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute top-2 right-2">
          <Check className="w-4 h-4 text-primary" />
        </div>
      )}
    </button>
  );
});

export function CurrencySelector({
  selectedCurrencies,
  onSelectionChange,
  mode = "multi",
  disabled = false,
  className,
  showRates = true,
}: CurrencySelectorProps) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [trends, setTrends] = useState<Record<string, "up" | "down">>({});

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      // Simulate real-time rate fetching
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fetchedRates: Record<string, number> = {};
      const fetchedTrends: Record<string, "up" | "down"> = {};
      for (const [code] of Object.entries(MULTI_CURRENCY_ASSETS)) {
        const base = MOCK_RATES[code] ?? 1.0;
        const jitter = 1 + (Math.random() - 0.5) * 0.02;
        fetchedRates[code] = base * jitter;
        fetchedTrends[code] = Math.random() > 0.5 ? "up" : "down";
      }
      setRates(fetchedRates);
      setTrends(fetchedTrends);
    } catch {
      // Use fallback mock rates
      setRates({ ...MOCK_RATES });
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 30_000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const handleToggle = (code: string) => {
    if (disabled) return;

    if (mode === "single") {
      onSelectionChange([code]);
      return;
    }

    if (selectedCurrencies.includes(code)) {
      if (selectedCurrencies.length <= 1) return;
      onSelectionChange(selectedCurrencies.filter((c) => c !== code));
    } else {
      onSelectionChange([...selectedCurrencies, code]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.keys(MULTI_CURRENCY_ASSETS).map((code) => (
          <CurrencyCard
            key={code}
            code={code}
            selected={selectedCurrencies.includes(code)}
            rate={rates[code] ?? null}
            rateLoading={ratesLoading}
            onClick={() => handleToggle(code)}
            disabled={disabled}
            showRate={showRates}
          />
        ))}
      </div>

      {mode === "multi" && selectedCurrencies.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Selected:</span>
          {selectedCurrencies.map((code) => {
            const asset = MULTI_CURRENCY_ASSETS[code];
            const trend = trends[code];
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full"
              >
                {asset?.icon} {code}
                {showRates && rates[code] && trend && (
                  trend === "up" ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
