"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const mockChartData = [
  { name: "Mon", volume: 45000, fee: 450 },
  { name: "Tue", volume: 52000, fee: 520 },
  { name: "Wed", volume: 38000, fee: 380 },
  { name: "Thu", volume: 61000, fee: 610 },
  { name: "Fri", volume: 59000, fee: 590 },
  { name: "Sat", volume: 72000, fee: 720 },
  { name: "Sun", volume: 68000, fee: 680 },
];

interface PlatformVolumeChartProps {
  height?: number;
}

export default function PlatformVolumeChart({
  height = 300,
}: PlatformVolumeChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={mockChartData}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value / 1000}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
            cursor={{ fill: "hsl(var(--accent))" }}
          />
          <Bar
            yAxisId="left"
            dataKey="volume"
            fill="hsl(var(--border))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="fee"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
