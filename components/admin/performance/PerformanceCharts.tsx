"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMs, formatDate } from "./performanceFormat";
import type { TrendPoint, DistributionBucket } from "./performanceFormat";

export function TrendChart({
  data,
  metric,
  isDark,
}: {
  data: TrendPoint[];
  metric: string;
  isDark: boolean;
}) {
  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    p50: d.percentiles.p50,
    p75: d.percentiles.p75,
    p90: d.percentiles.p90,
    p95: d.percentiles.p95,
    count: d.count,
  }));

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => formatMs(v, metric)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "var(--card)" : "var(--card)",
              borderColor: isDark ? "var(--border)" : "var(--border)",
              color: isDark ? "var(--foreground)" : "var(--foreground)",
            }}
            formatter={(value, name) => [
              formatMs(Number(value ?? 0), metric),
              name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="p50"
            stroke="var(--primary)"
            strokeWidth={2}
            name="p50"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p75"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="p75"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p90"
            stroke="var(--warning)"
            strokeWidth={2}
            name="p90"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p95"
            stroke="var(--destructive)"
            strokeWidth={2}
            name="p95"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({
  data,
  metric,
  isDark,
}: {
  data: DistributionBucket[];
  metric: string;
  isDark: boolean;
}) {
  const chartData = data.map((d) => ({
    range: `${formatMs(d.lower, metric)}–${d.upper === Infinity ? "+" : formatMs(d.upper, metric)}`,
    count: d.count,
  }));

  return (
    <div className="w-full" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="range"
            stroke="var(--muted-foreground)"
            fontSize={10}
            tickLine={false}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "var(--card)" : "var(--card)",
              borderColor: isDark ? "var(--border)" : "var(--border)",
              color: isDark ? "var(--foreground)" : "var(--foreground)",
            }}
          />
          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}