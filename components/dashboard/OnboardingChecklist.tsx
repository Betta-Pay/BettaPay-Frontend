"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  ShieldCheck,
  Building,
  LinkIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOnboardingChecklist,
  getDismissed,
  setDismissed,
} from "@/lib/hooks/useOnboardingChecklist";
import Link from "next/link";

export function OnboardingChecklist() {
  const { items, completedCount, totalCount, isComplete, isLoading } =
    useOnboardingChecklist();
  const [dismissed, setLocalDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setLocalDismissed(getDismissed());
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setLocalDismissed(true);
  }, []);

  // handleRestore is available for future use (e.g. a "show again" button)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRestore = useCallback(() => {
    setDismissed(false);
    setLocalDismissed(false);
  }, []);

  if (isLoading || dismissed || isComplete) {
    return null;
  }

  const progressPercent =
    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Custom step metadata for gamified activation experience
  const stepMeta: Record<
    string,
    { badge: string; icon: typeof CheckCircle2 }
  > = {
    "payment-link": { badge: "Instant Access", icon: LinkIcon },
    settlement: { badge: "NIBSS / CBN Verified", icon: Building },
    kyc: { badge: "Lifts $500 Limit", icon: ShieldCheck },
    webhook: { badge: "Dev Automation", icon: Sparkles },
  };

  return (
    <Card className="border border-primary/30 bg-gradient-to-br from-amber-50/60 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card shadow-sm rounded-2xl overflow-hidden transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-heading font-semibold text-foreground">
                Merchant Activation Hub
              </CardTitle>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {completedCount === totalCount
                  ? "Fully Verified"
                  : `Level ${completedCount + 1}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete these 3 milestones to lift the $500 payout cap and enable instant NGN settlement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label={collapsed ? "Expand activation drawer" : "Collapse activation drawer"}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4 p-4 sm:p-5 pt-0">
          {/* Progress bar and tier limit banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground">
                Activation Progress: <span className="text-foreground font-semibold font-mono">{completedCount} of {totalCount} Completed</span>
              </span>
              <span className="text-primary font-bold font-mono">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(240,165,0,0.5)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Gamified Milestone Cards */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 3).map((item, idx) => {
              const meta = stepMeta[item.id] || {
                badge: "Required",
                icon: CheckCircle2,
              };

              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-200",
                    item.completed
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-card border-border hover:border-primary/40 hover:shadow-xs"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                        Step 0{idx + 1}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md",
                          item.completed
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-primary/10 text-primary border border-primary/20"
                        )}
                      >
                        {item.completed ? "Completed" : meta.badge}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex-shrink-0">
                        {item.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs font-bold leading-snug",
                            item.completed
                              ? "text-emerald-700 dark:text-emerald-300 line-through opacity-80"
                              : "text-foreground"
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end">
                    <Link href={item.href} className="w-full">
                      <Button
                        variant={item.completed ? "ghost" : "default"}
                        size="sm"
                        className={cn(
                          "w-full h-8 text-xs font-semibold rounded-lg justify-between",
                          item.completed
                            ? "text-muted-foreground hover:text-foreground"
                            : "bg-primary hover:bg-primary-hover text-primary-foreground shadow-button"
                        )}
                      >
                        <span>{item.ctaLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function OnboardingRestoreBanner() {
  const [dismissed, setLocalDismissed] = useState(false);

  useEffect(() => {
    setLocalDismissed(getDismissed());
  }, []);

  const handleRestore = useCallback(() => {
    setDismissed(false);
    setLocalDismissed(false);
    window.location.reload();
  }, []);

  if (!dismissed) return null;

  return (
    <button
      onClick={handleRestore}
      className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors font-medium"
    >
      Show activation checklist
    </button>
  );
}
