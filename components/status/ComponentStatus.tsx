"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { StatusComponent } from "@/lib/status/data";
import { cn } from "@/lib/utils";

interface ComponentStatusProps {
  components: StatusComponent[];
}

const levelConfig: Record<
  string,
  { icon: React.ElementType; badge: string; dot: string; label: string }
> = {
  operational: {
    icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "Operational",
  },
  degraded: {
    icon: AlertTriangle,
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    label: "Degraded",
  },
  down: {
    icon: XCircle,
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    dot: "bg-destructive",
    label: "Down",
  },
};

function formatDate(iso: string | null): string {
  if (!iso) return "None";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ComponentStatusGrid({ components }: ComponentStatusProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {components.map((component) => {
        const config = levelConfig[component.status];
        const Icon = config.icon;

        return (
          <div
            key={component.id}
            className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {component.name}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  config.badge
                )}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Uptime:{" "}
                <span className="font-semibold text-foreground">
                  {component.uptimePercent}%
                </span>
              </span>
              <span>Last incident: {formatDate(component.lastIncident)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
