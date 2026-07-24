"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Activity,
  Clock,
} from "lucide-react";
import type { Incident } from "@/lib/status/data";
import { mockComponents } from "@/lib/status/data";
import { cn } from "@/lib/utils";

interface IncidentTimelineProps {
  incidents: Incident[];
}

const statusBadge: Record<
  Incident["status"],
  { icon: React.ElementType; className: string; label: string }
> = {
  investigating: {
    icon: Search,
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    label: "Investigating",
  },
  identified: {
    icon: AlertTriangle,
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    label: "Identified",
  },
  monitoring: {
    icon: Activity,
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    label: "Monitoring",
  },
  resolved: {
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    label: "Resolved",
  },
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function IncidentTimeline({ incidents }: IncidentTimelineProps) {
  const [filter, setFilter] = useState<string>("all");

  const componentNames = Array.from(
    new Set(incidents.flatMap((inc) => inc.affectedComponents))
  );

  const filtered =
    filter === "all"
      ? incidents
      : incidents.filter((inc) => inc.affectedComponents.includes(filter));

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
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
        {componentNames.map((cid) => {
          const comp = mockComponents.find((c) => c.id === cid);
          return (
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
              {comp?.name ?? cid}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {filtered.map((incident) => {
          const badgeConfig = statusBadge[incident.status];
          const BadgeIcon = badgeConfig.icon;

          return (
            <div key={incident.id} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full border flex items-center justify-center shrink-0",
                      badgeConfig.className
                    )}
                  >
                    <BadgeIcon className="w-4 h-4" />
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
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                          badgeConfig.className
                        )}
                      >
                        <BadgeIcon className="w-3 h-3" />
                        {badgeConfig.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    Affected:{" "}
                    {incident.affectedComponents
                      .map(
                        (cid) =>
                          mockComponents.find((c) => c.id === cid)?.name ?? cid
                      )
                      .join(", ")}
                  </p>

                  <div className="space-y-3">
                    {incident.updates.map((update, idx) => {
                      const updateCfg = statusBadge[update.status];
                      const UpdateIcon = updateCfg.icon;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 pl-1"
                        >
                          <UpdateIcon
                            className={cn(
                              "w-3.5 h-3.5 shrink-0 mt-0.5",
                              updateCfg.className.includes("amber")
                                ? "text-amber-500"
                                : updateCfg.className.includes("blue")
                                  ? "text-blue-500"
                                  : updateCfg.className.includes("purple")
                                    ? "text-purple-500"
                                    : "text-emerald-500"
                            )}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-foreground capitalize">
                                {update.status}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="w-2.5 h-2.5" />
                                {formatTimestamp(update.timestamp)}
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
