"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Check, TrendingUp, TrendingDown, Loader2, Search } from "lucide-react";
import { MULTI_CURRENCY_ASSETS, MOCK_RATES, USE_MOCK_RATE_DATA } from "@/lib/utils/constants";
import { useEnabledAssets } from "@/lib/assets/hooks";
import type { SupportedAsset } from "@/lib/assets/types";
import {
  AssetGridSkeleton,
  AssetLoadError,
  UnsupportedAssetBanner,
} from "@/components/assets/AssetPickerStates";

export const DEFAULT_CURRENCY_SEARCH_DEBOUNCE_MS = 150;

export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_CURRENCY_SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export interface CurrencySelectorProps {
  selectedCurrencies: string[];
  onSelectionChange: (currencies: string[]) => void;
  mode?: "single" | "multi";
  disabled?: boolean;
  className?: string;
  showRates?: boolean;
  debounceMs?: number;
}

interface CurrencyCardProps {
  asset: SupportedAsset;
  selected: boolean;
  rate: number | null;
  rateLoading: boolean;
  onToggle: (code: string) => void;
  disabled: boolean;
  showRate: boolean;
}

const CurrencyCard = memo(function CurrencyCard({
  asset,
  selected,
  rate,
  rateLoading,
  onToggle,
  disabled,
  showRate,
}: CurrencyCardProps) {
  const { code } = asset;
  // The glyph is presentation only; assets the admin added later fall back to
  // their first letter instead of being hidden.
  const icon = MULTI_CURRENCY_ASSETS[code]?.icon ?? code.charAt(0);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(code)}
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
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{code}</span>
          <span className="text-xs text-muted-foreground truncate">{asset.name}</span>
        </div>
        {showRate && (
          <div className="mt-0.5">
            {rateLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : rate !== null ? (
              <span className="text-xs text-muted-foreground">
                1 {code} ≈ ${rate.toFixed(4)} USD
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
  debounceMs = DEFAULT_CURRENCY_SEARCH_DEBOUNCE_MS,
}: CurrencySelectorProps) {
  const assetsQuery = useEnabledAssets();
  const assets = assetsQuery.data;
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesLoading, setRatesLoading] = useState(true);
  const [trends, setTrends] = useState<Record<string, "up" | "down">>({});
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery, debounceMs);

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return assets;
    return assets.filter(
      (asset) =>
        asset.code.toLowerCase().includes(normalized) ||
        asset.name.toLowerCase().includes(normalized)
    );
  }, [assets, debouncedQuery]);

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);

    if (!USE_MOCK_RATE_DATA) {
      setRates({});
      setTrends({});
      setRatesLoading(false);
      return;
    }

    try {
      // Simulate real-time rate fetching
      await new Promise((resolve) => setTimeout(resolve, 500));
      const fetchedRates: Record<string, number> = {};
      const fetchedTrends: Record<string, "up" | "down"> = {};
      for (const code of Object.keys(MULTI_CURRENCY_ASSETS)) {
        const base = MOCK_RATES[code] ?? 1.0;
        const jitter = 1 + (Math.random() - 0.5) * 0.02;
        fetchedRates[code] = base * jitter;
        fetchedTrends[code] = Math.random() > 0.5 ? "up" : "down";
      }
      setRates(fetchedRates);
      setTrends(fetchedTrends);
    } catch {
      // Use fallback mock rates only when explicitly enabled.
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

  const selectedSet = useMemo(() => new Set(selectedCurrencies), [selectedCurrencies]);

  const handleToggle = useCallback(
    (code: string) => {
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
    },
    [disabled, mode, onSelectionChange, selectedCurrencies],
  );

  // Anything selected that the backend no longer lists as enabled.
  const unsupported = assets
    ? selectedCurrencies.filter((code) => !assetsQuery.codes.has(code))
    : [];

  // A failed refetch must not keep serving the previous list as if it were
  // current, so an error replaces the grid outright.
  if (assetsQuery.isError) {
    return (
      <div className={cn("space-y-3", className)}>
        <AssetLoadError onRetry={() => void assetsQuery.refetch()} />
      </div>
    );
  }

  if (!assets) {
    return (
      <div className={cn("space-y-3", className)}>
        <AssetGridSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <UnsupportedAssetBanner
        codes={unsupported}
        onRemove={() => onSelectionChange(selectedCurrencies.filter((c) => assetsQuery.codes.has(c)))}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search currencies..."
          aria-label="Search currencies"
          className={cn(
            "w-full rounded-xl border border-border/50 bg-background/50 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      </div>
      {filteredAssets.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No matching currencies found
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {filteredAssets.map((asset) => (
            <CurrencyCard
              key={asset.code}
              asset={asset}
              selected={selectedSet.has(asset.code)}
              rate={rates[asset.code] ?? null}
              rateLoading={ratesLoading}
              onToggle={handleToggle}
              disabled={disabled}
              showRate={showRates}
            />
          ))}
        </div>
      )}

      {USE_MOCK_RATE_DATA && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Using sample rates
        </div>
      )}

      {mode === "multi" && selectedCurrencies.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Selected:</span>
          {selectedCurrencies.map((code) => {
            const icon = MULTI_CURRENCY_ASSETS[code]?.icon ?? code.charAt(0);
            const trend = trends[code];
            const isUnsupported = unsupported.includes(code);
            return (
              <span
                key={code}
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  isUnsupported
                    ? "bg-destructive/10 text-destructive line-through"
                    : "bg-primary/10 text-primary",
                )}
              >
                {icon} {code}
                {isUnsupported && <span className="sr-only"> (unsupported)</span>}
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
