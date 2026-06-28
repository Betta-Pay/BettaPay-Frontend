"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        <p className="text-amber-600 font-bold">
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
              <stop offset="5%" stopColor="#F0A500" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#F1F5F9"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke="#CBD5E1"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94A3B8" }}
          />
          <YAxis
            stroke="#CBD5E1"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v}`}
            tick={{ fill: "#94A3B8" }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#F0A500"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#F0A500",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
