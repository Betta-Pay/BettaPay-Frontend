"use client";

import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { cn } from "@/lib/utils";

export interface ChartFrameProps {
  /** Accessible name for the chart region. */
  ariaLabel: string;
  /** Deterministic height — prevents recharts zero-size warnings in flex layouts. */
  height?: number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Shared shell for chart components: fixed min-height, loading skeleton, and
 * empty state. Keeps loading vs empty distinguishable and stops
 * ResponsiveContainer from collapsing to zero height.
 */
export function ChartFrame({
  ariaLabel,
  height = 260,
  isLoading = false,
  isEmpty = false,
  emptyTitle = "No chart data yet",
  emptyDescription = "Data will appear here once activity is recorded for this period.",
  className,
  children,
}: ChartFrameProps) {
  const frameStyle = { height, minHeight: height };

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label={`Loading ${ariaLabel}`}
        aria-busy="true"
        className={cn("w-full", className)}
        style={frameStyle}
        data-testid="chart-loading"
      >
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        role="status"
        aria-label={`${ariaLabel} empty`}
        className={cn(
          "w-full flex items-center justify-center border border-dashed border-border/60 rounded-xl bg-muted/20",
          className,
        )}
        style={frameStyle}
        data-testid="chart-empty"
      >
        <EmptyState
          icon={BarChart3}
          title={emptyTitle}
          description={emptyDescription}
          compact
        />
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className={cn("w-full relative min-h-0", className)}
      style={frameStyle}
    >
      {/* Absolute fill keeps ResponsiveContainer sized even inside flex parents. */}
      <div className="absolute inset-0 min-h-[1px] min-w-[1px]">
        {children}
      </div>
    </div>
  );
}
