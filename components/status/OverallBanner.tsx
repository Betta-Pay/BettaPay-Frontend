"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ComponentStatusLevel } from "@/lib/status/data";
import { cn } from "@/lib/utils";

interface OverallBannerProps {
  status: ComponentStatusLevel;
  label: string;
}

const statusConfig: Record<
  ComponentStatusLevel,
  {
    icon: React.ElementType;
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  }
> = {
  operational: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-500",
  },
  degraded: {
    icon: AlertTriangle,
    bg: "bg-amber-500/10 dark:bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  down: {
    icon: XCircle,
    bg: "bg-destructive/10 dark:bg-destructive/5",
    border: "border-destructive/20",
    text: "text-destructive",
    iconColor: "text-destructive",
  },
};

export function OverallBanner({ status, label }: OverallBannerProps) {
  const [lastChecked, setLastChecked] = useState(() => new Date());
  const config = statusConfig[status];
  const Icon = config.icon;

  useEffect(() => {
    const interval = setInterval(() => setLastChecked(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
        config.bg,
        config.border
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("w-6 h-6 shrink-0", config.iconColor)} />
        <span className={cn("text-lg font-bold", config.text)}>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        Last checked: {lastChecked.toLocaleTimeString()}
      </div>
    </div>
  );
}
