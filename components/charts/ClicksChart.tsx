"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartFrame } from "@/components/charts/ChartFrame";

interface ClicksChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ClicksChartTooltipProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (active && payload && payload.length) {
    return (
      <div
        className="border rounded-xl p-3 shadow-lg text-sm"
        style={{
          backgroundColor: isDark ? "var(--card)" : "var(--card)",
          borderColor: isDark ? "var(--border)" : "var(--border)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: isDark ? "var(--foreground)" : "var(--foreground)" }}>{label}</p>
        <p className="font-bold" style={{ color: isDark ? "var(--primary)" : "var(--primary)" }}>
          {payload[0]?.value} clicks
        </p>
      </div>
    );
  }
  return null;
};

interface ClicksChartProps {
  data: { date: string; clicks: number }[];
  height?: number;
  isLoading?: boolean;
}

export default function ClicksChart({
  data,
  height = 260,
  isLoading = false,
}: ClicksChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isEmpty = !isLoading && data.length === 0;

  return (
    <ChartFrame
      ariaLabel="Payment link clicks chart"
      height={height}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyTitle="No clicks yet"
      emptyDescription="Click activity will appear here once visitors open this payment link."
      className={cn("w-full")}
    >
      <table className="sr-only" aria-label="Payment link clicks data table">
        <caption>Payment link clicks over time</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Clicks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td>{row.date}</td>
              <td>{row.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={isDark ? 0.4 : 0.25} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={isDark ? 0.05 : 0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
            interval="preserveStartEnd"
            aria-label="Date"
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)" }}
            aria-label="Clicks"
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="clicks"
            name="Clicks"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorClicks)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "var(--primary)",
              stroke: "var(--card)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
