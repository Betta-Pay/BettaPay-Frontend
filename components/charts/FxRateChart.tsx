"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
// Imported directly (not via the barrel) to keep this lazy-loaded chunk lean.
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { formatCurrency } from "@/lib/utils/format";

export interface FxRatePoint {
  date: string;
  rate: number;
  /** Optional secondary asset rate (e.g., XLM/NGN). When absent, the secondary series is not rendered. */
  secondaryRate?: number | null;
}

/** 7 days of USDC/NGN rates — used when the caller does not supply live data. */
const fxHistory: FxRatePoint[] = [
  { date: "Jan 7", rate: 1480 },
  { date: "Jan 8", rate: 1495 },
  { date: "Jan 9", rate: 1510 },
  { date: "Jan 10", rate: 1505 },
  { date: "Jan 11", rate: 1520 },
  { date: "Jan 12", rate: 1545 },
  { date: "Jan 13", rate: 1550 },
];

export interface FxTooltipProps {
  active?: boolean;
  payload?: { value: number; name?: string; dataKey?: string }[];
  label?: string;
  currency?: string;
}

export const FxTooltip = ({ active, payload, label, currency = 'NGN' }: FxTooltipProps) => {
  if (active && payload && payload.length) {
    // Filter out empty / null secondary entries so tooltip doesn't show ghost values.
    const populated = payload.filter((p) => typeof p.value === 'number' && !Number.isNaN(p.value));
    if (populated.length === 0) return null;
    return (
      <div 
        className="border rounded-xl p-3 shadow-lg text-sm bg-card border-border text-foreground"
      >
        <p className="font-semibold mb-1 text-foreground">{label}</p>
        {populated.map((entry, idx) => (
          <p key={idx} className="font-bold" style={{ color: entry.dataKey === 'secondaryRate' ? 'var(--chart-2, var(--secondary, var(--primary)))' : 'var(--primary)' }}>
            {entry.name ?? (entry.dataKey === 'secondaryRate' ? 'XLM/NGN' : 'USDC/NGN')}: {formatCurrency(entry.value, currency)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface FxRateChartProps {
  height?: number;
  pairLabel?: string;
  currency?: string;
  /** Live rate history. Falls back to 7 days of mock USDC/NGN data when omitted. Aligns with useRates primary semantics (USDC/NGN). */
  data?: FxRatePoint[];
  /** Set when the caller's rate fetch failed — renders an in-chart error state. */
  error?: string | Error | null;
  onRetry?: () => void;
}

export default function FxRateChart({
  height = 240,
  pairLabel = 'USDC/NGN',
  currency = 'NGN',
  data,
  error = null,
  onRetry,
}: FxRateChartProps) {
  const formatRate = (value: number) => formatCurrency(value, currency);
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Align with useRates: primary is USDC/NGN (rate). Fallback to mock history when data is undefined,
  // mirroring the hook's fallback to null primaryRate — the chart shows mock USDC/NGN history as a demo,
  // but live data, when supplied, is expected to be USDC/NGN for primary consistency.
  const chartData = useMemo(() => (data && data.length > 0 ? data : fxHistory), [data]);
  const hasError = Boolean(error) || (data !== undefined && data.length === 0);

  // Guard each series: only render a series if it has at least one populated point.
  // This prevents ghost series / legend duplication when secondary asset is absent.
  const hasPrimary = useMemo(
    () => chartData.some((d) => typeof d.rate === 'number' && !Number.isNaN(d.rate)),
    [chartData]
  );
  const hasSecondary = useMemo(
    () => chartData.some((d) => d.secondaryRate != null && typeof d.secondaryRate === 'number' && !Number.isNaN(d.secondaryRate)),
    [chartData]
  );

  const hasAnySeries = hasPrimary || hasSecondary;

  if (hasError) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <ErrorDisplay
          message={
            typeof error === "string"
              ? error
              : "Unable to load FX rate history."
          }
          onRetry={onRetry}
        />
      </div>
    );
  }

  // Centered empty state per series: if no series has data, show a single centered empty state.
  // If only one series is missing, we don't render that series at all (no ghost) and let the
  // populated series fill the chart; the legend will only show the populated series.
  if (!hasAnySeries) {
    return (
      <div
        role="region"
        aria-label={`${pairLabel.replace('/', ' to ')} exchange rate chart`}
        className="w-full flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/20"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No rate data available</p>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`${pairLabel.replace('/', ' to ')} exchange rate chart`}
      className="w-full relative"
      style={{ height }}
    >
      <table className="sr-only" aria-label={`${pairLabel.replace('/', ' to ')} exchange rate data table`}>
        <caption>{pairLabel.replace('/', ' to ')} exchange rate history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Exchange Rate ({currency})</th>
            {hasSecondary && <th scope="col">Secondary Rate (NGN)</th>}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, index) => (
            <tr key={index}>
              <td>{row.date}</td>
              <td>{formatRate(row.rate)}</td>
              {hasSecondary && <td>{row.secondaryRate != null ? formatRate(row.secondaryRate) : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -10 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="colorFxRate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.4 : 0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.05 : 0} />
            </linearGradient>
            <linearGradient id="colorFxSecondary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2, var(--secondary))" stopOpacity={isDark ? 0.35 : 0.2} />
              <stop offset="95%" stopColor="var(--chart-2, var(--secondary))" stopOpacity={isDark ? 0.05 : 0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            aria-label="Date"
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatRate}
            tick={{ fill: "var(--muted-foreground)" }}
            domain={["auto", "auto"]}
            width={isMobile ? 52 : 64}
            aria-label={`Exchange Rate (${currency})`}
          />
          <Tooltip content={<FxTooltip currency={currency} />} />
          {/* Only render legend entries for populated series — missing secondary doesn't produce a ghost entry */}
          {(hasPrimary || hasSecondary) && (
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              iconType="plainline"
            />
          )}
          {hasPrimary && (
            <Area
              type="monotone"
              dataKey="rate"
              name={pairLabel}
              stroke="var(--primary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorFxRate)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--primary)",
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
            />
          )}
          {hasSecondary && (
            <Area
              type="monotone"
              dataKey="secondaryRate"
              name="XLM/NGN"
              stroke="var(--chart-2, var(--secondary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorFxSecondary)"
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--chart-2, var(--secondary))",
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              connectNulls={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Per-series centered empty state: when a series is expected but has no data, the chart
          area for that series is simply not rendered. If both series are missing, the top-level
          empty state above is shown. This avoids ghost series while keeping the populated series visible. */}
    </div>
  );
}
