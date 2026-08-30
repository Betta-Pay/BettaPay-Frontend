"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { formatNumber } from "@/lib/utils/format";

/** Minimal shape this chart needs from a payment — matches `ApiPayment`. */
export interface RevenuePayment {
  amountUsdc: number;
  createdAt: string;
  status?: string;
}

export interface RevenueChartPoint {
  /** Day label shown on the X axis. */
  name: string;
  /** Revenue received that day. */
  total: number;
  /** Cumulative volume up to and including that day. */
  volume: number;
}

/** Preview data — used only when the parent supplies no payments. Exported for testing and for RevenueChartSection to derive totals from the same source. */
export const mockChartData: RevenueChartPoint[] = [
  { name: "Mon", total: 1200, volume: 1200 },
  { name: "Tue", total: 2100, volume: 3300 },
  { name: "Wed", total: 1800, volume: 5100 },
  { name: "Thu", total: 3200, volume: 8300 },
  { name: "Fri", total: 2800, volume: 11100 },
  { name: "Sat", total: 4100, volume: 15200 },
  { name: "Sun", total: 3800, volume: 19000 },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Buckets payments into calendar days, then walks the days in order to build a
 * running cumulative volume. Failed payments never count towards revenue.
 */
export const aggregatePaymentsByDay = (
  payments: RevenuePayment[]
): RevenueChartPoint[] => {
  const byDay = new Map<string, number>();

  for (const payment of payments) {
    if (!payment?.createdAt) continue;
    if (payment.status?.toLowerCase() === "failed") continue;

    const amount = Number(payment.amountUsdc);
    if (!Number.isFinite(amount)) continue;

    const date = new Date(payment.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const key = date.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + amount);
  }

  let cumulative = 0;

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      cumulative += total;
      return {
        name: new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        total: round2(total),
        volume: round2(cumulative),
      };
    });
};

const formatUsd = (value: number) =>
  `$${formatNumber(value, undefined, { maximumFractionDigits: 0 })}`;

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string; name?: string }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (active && payload && payload.length) {
    const daily = payload.find((p) => p.dataKey === "total")?.value;
    const cumulative = payload.find((p) => p.dataKey === "volume")?.value;

    return (
      <div
        className="border rounded-xl p-3 shadow-lg text-sm"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
        <p className="font-bold" style={{ color: "var(--primary)" }}>
          {formatUsd(daily ?? 0)}
        </p>
        {cumulative !== undefined && (
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Cumulative {formatUsd(cumulative)}
          </p>
        )}
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  height?: number;
  /**
   * Payments from `usePayments`, or pre-aggregated chart points.
   * Pass `mockChartData` explicitly when a preview series is desired.
   * An empty array renders the empty state (no silent mock fallback).
   */
  data?: RevenuePayment[] | RevenueChartPoint[];
  /** When true, render a skeleton instead of axes/empty state. */
  isLoading?: boolean;
}

const isAggregated = (
  data: RevenuePayment[] | RevenueChartPoint[]
): data is RevenueChartPoint[] =>
  data.length > 0 && (data[0] as RevenueChartPoint).name !== undefined;

export default function RevenueChart({
  height = 260,
  data,
  isLoading = false,
}: RevenueChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const chartData = useMemo(() => {
    // Undefined data keeps the historical preview series for callers that omit
    // `data` entirely. Explicit `[]` is treated as empty (no silent mock swap).
    if (data === undefined) return mockChartData;
    if (data.length === 0) return [];
    if (isAggregated(data)) return data;

    return aggregatePaymentsByDay(data as RevenuePayment[]);
  }, [data]);

  const isEmpty = !isLoading && chartData.length === 0;

  return (
    <ChartFrame
      ariaLabel="Revenue and volume chart"
      height={height}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyTitle="No revenue yet"
      emptyDescription="Revenue will appear here once you receive completed payments."
    >
      <table className="sr-only" aria-label="Revenue and volume data table">
        <caption>Daily revenue and cumulative volume</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Daily Revenue (USD)</th>
            <th scope="col">Cumulative Volume (USD)</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, index) => (
            <tr key={index}>
              <td>{row.name}</td>
              <td>${formatNumber(row.total, undefined, { maximumFractionDigits: 0 })}</td>
              <td>${formatNumber(row.volume, undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -16 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.9 : 0.8} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.25 : 0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            aria-label="Day of week"
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatUsd}
            tick={{ fill: "var(--muted-foreground)" }}
            aria-label="Amount in USD"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
          />
          <Bar
            dataKey="total"
            name="Daily revenue"
            fill="url(#colorRevenue)"
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Line
            type="monotone"
            dataKey="volume"
            name="Cumulative volume"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--primary)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
