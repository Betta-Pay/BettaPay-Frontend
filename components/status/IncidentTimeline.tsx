"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Activity,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { Incident } from "@/lib/status/data";
import { getComponentName } from "@/lib/status/data";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/status/time";
import { STATUS_TONE_BADGE, STATUS_TONE_TEXT, type StatusTone } from "@/lib/status/palette";
import { useNow } from "@/lib/hooks/useNow";
import { cn } from "@/lib/utils";

interface IncidentTimelineProps {
  incidents: Incident[];
}

const statusBadge: Record<
  Incident["status"],
  { icon: LucideIcon; tone: StatusTone; label: string }
> = {
  investigating: { icon: Search, tone: "warn", label: "Investigating" },
  identified: { icon: AlertTriangle, tone: "info", label: "Identified" },
  monitoring: { icon: Activity, tone: "progress", label: "Monitoring" },
  resolved: { icon: CheckCircle2, tone: "ok", label: "Resolved" },
};

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  const [filter, setFilter] = useState<string>("all");
  // Recomputed on an interval so "45 minutes ago" becomes "46 minutes ago"
  // without a reload.
  const now = useNow();

  const componentIds = Array.from(
    new Set(incidents.flatMap((inc) => inc.affectedComponents))
  );

  const filtered =
    filter === "all"
      ? incidents
      : incidents.filter((inc) => inc.affectedComponents.includes(filter));

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2
          className="w-12 h-12 text-status-ok mx-auto mb-4"
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          No Incidents
        </h3>
        <p className="text-sm text-muted-foreground">
          No incidents have been reported for this period.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            filter === "all"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted text-muted-foreground border-border hover:text-foreground"
          )}
        >
          All
        </button>
        {componentIds.map((cid) => (
          <button
            key={cid}
            onClick={() => setFilter(cid)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === cid
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {getComponentName(cid)}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filtered.map((incident) => {
          const badgeConfig = statusBadge[incident.status];
          const BadgeIcon = badgeConfig.icon as any;
          const closedAt = incident.resolvedAt ?? incident.updates.at(-1)?.timestamp ?? null;

          return (
            <div key={incident.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
                      STATUS_TONE_BADGE[badgeConfig.tone]
                    )}
                  >
                    <BadgeIcon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="w-px flex-1 bg-border mt-2" />
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      {incident.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                          STATUS_TONE_BADGE[badgeConfig.tone]
                        )}
                      >
                        <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                        {badgeConfig.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-1">
                    Affected:{" "}
                    {incident.affectedComponents.map(getComponentName).join(", ")}
                  </p>

                  <p className="text-xs text-muted-foreground mb-3">
                    {incident.resolvedAt ? "Resolved" : "Last updated"}{" "}
                    <time dateTime={closedAt ?? undefined}>
                      {formatRelativeTime(closedAt, now)}
                    </time>
                  </p>

                  <div className="space-y-3">
                    {incident.updates.map((update, idx) => {
                      const updateCfg = statusBadge[update.status];
                      const UpdateIcon = updateCfg.icon as any;
                      return (
                        <div key={idx} className="flex items-start gap-3 pl-1">
                          <UpdateIcon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0 mt-0.5",
                              STATUS_TONE_TEXT[updateCfg.tone]
                            )}
                            aria-hidden="true"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground capitalize">
                                {update.status}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                                <time dateTime={update.timestamp}>
                                  {formatRelativeTime(update.timestamp, now)}
                                </time>
                                <span aria-hidden="true">·</span>
                                {formatAbsoluteTime(update.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {update.message}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
