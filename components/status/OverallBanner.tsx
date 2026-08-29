"use client";

import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-react";
import type { ComponentStatusLevel } from "@/lib/status/data";
import { STATUS_TONE_BADGE, STATUS_TONE_DOT, STATUS_TONE_TEXT, type StatusTone } from "@/lib/status/palette";
import { useNow } from "@/lib/hooks/useNow";
import { cn } from "@/lib/utils";

interface OverallBannerProps {
  status: ComponentStatusLevel;
  label: string;
}

const statusConfig: Record<
  ComponentStatusLevel,
  { icon: LucideIcon; tone: StatusTone }
> = {
  operational: { icon: CheckCircle2, tone: "ok" },
  degraded: { icon: AlertTriangle, tone: "warn" },
  down: { icon: XCircle, tone: "down" },
  unknown: { icon: HelpCircle, tone: "neutral" },
};

export function OverallBanner({ status, label }: OverallBannerProps) {
  const now = useNow();
  const config = statusConfig[status] ?? statusConfig.unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon = config.icon as any;

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        STATUS_TONE_BADGE[config.tone]
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("w-6 h-6 shrink-0", STATUS_TONE_TEXT[config.tone])} aria-hidden="true" />
        <span className="text-lg font-bold">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs font-medium">
        <span
          className={cn("w-2 h-2 rounded-full animate-pulse", STATUS_TONE_DOT[config.tone])}
          aria-hidden="true"
        />
        Last checked: {new Date(now).toLocaleTimeString()}
      </div>
    </div>
  );
}
