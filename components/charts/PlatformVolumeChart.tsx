"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useTheme } from 'next-themes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { ErrorDisplay } from '@/components/shared';
import { Skeleton } from '@/components/ui';
import { formatNumber } from '@/lib/utils/format';

interface ChartDataItem {
  name: string;
  volume: number;
  fee: number;
}

export default function PlatformVolumeChart({ height = 300 }: { height?: number }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { data, isLoading, isError, refetch } = useQuery<ChartDataItem[]>({
    queryKey: ['platform-volume'],
    queryFn: async () => {
      const response = await axios.get<ChartDataItem[]>('/api/platform-volume');
      return response.data;
    },
  });

  if (isError) {
    return (
      <div
        className="w-full flex items-center justify-center"
        style={{ height, minHeight: height }}
        role="alert"
      >
        <ErrorDisplay
          message="Failed to load platform volume data."
          onRetry={() => { void refetch(); }}
        />
      </div>
    );
  }

  const series = data ?? [];
  const isEmpty = !isLoading && series.length === 0;

  return (
    <ChartFrame
      ariaLabel="Platform volume and fees chart"
      height={height}
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyTitle="No platform volume yet"
      emptyDescription="Volume and fee totals will appear here once settlements are processed."
    >
      <table className="sr-only" aria-label="Platform volume and fees data table">
        <caption>Platform volume and fee breakdown</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Volume (USD)</th>
            <th scope="col">Fee (USD)</th>
          </tr>
        </thead>
        <tbody>
          {series.map((row, index) => (
            <tr key={index}>
              <td>{row.name}</td>
              <td>${formatNumber(row.volume, undefined, { maximumFractionDigits: 0 })}</td>
              <td>${formatNumber(row.fee, undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <BarChart data={series} accessibilityLayer>
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            aria-label="Time Period"
          />
          <YAxis
            yAxisId="left"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value / 1000}k`}
            aria-label="Amount in USD"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? 'var(--card)' : 'var(--card)',
              borderColor: isDark ? 'var(--border)' : 'var(--border)',
              color: isDark ? 'var(--foreground)' : 'var(--foreground)',
            }}
            cursor={{ fill: 'var(--accent)' }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar
            yAxisId="left"
            dataKey="volume"
            name="Transaction Volume"
            fill="var(--border)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="fee"
            name="Platform Fee"
            fill="var(--primary)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
