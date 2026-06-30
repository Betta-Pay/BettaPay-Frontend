"use client";

import { useState, useEffect } from "react";
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

const mockChartData = [
  { name: "Mon", total: 1200, volume: 8400 },
  { name: "Tue", total: 2100, volume: 14700 },
  { name: "Wed", total: 1800, volume: 12600 },
  { name: "Thu", total: 3200, volume: 22400 },
  { name: "Fri", total: 2800, volume: 19600 },
  { name: "Sat", total: 4100, volume: 28700 },
  { name: "Sun", total: 3800, volume: 26600 },
];

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
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
          ${payload[0]?.value?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

interface RevenueChartProps {
  height?: number;
}

export default function RevenueChart({ height = 260 }: RevenueChartProps) {
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

  return (
    <div className={cn("w-full", height ? `h-[${height}px]` : "h-64")} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={mockChartData}
          margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? 0 : -16 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
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
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorRevenue)"
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
    </div>
  );
}
