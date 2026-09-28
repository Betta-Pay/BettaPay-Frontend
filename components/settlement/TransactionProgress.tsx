"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Circle, XCircle, AlertTriangle } from "lucide-react";

/** Backend-driven settlement progress — replaces synthetic step timing. */
export type SettlementProgressStatus =
  | "idle"
  | "signing"
  | "submitting"
  | "confirming"
  | "completed"
  | "failed";

/** Statuses every flow shares; anything else must match a step `key`. */
export type ProgressLifecycleStatus = "idle" | "completed" | "failed";

/** One stage of a transaction flow. `key` is the status that marks it active. */
export interface ProgressStep<K extends string = string> {
  key: K;
  label: string;
  description: string;
}

export type SettlementStepKey = Exclude<SettlementProgressStatus, ProgressLifecycleStatus>;

/** Default flow: Freighter-signed settlement submitted through Horizon. */
export const SETTLEMENT_STEPS: ReadonlyArray<ProgressStep<SettlementStepKey>> = [
  { key: "signing", label: "Freighter Signing", description: "Sign transaction in your Freighter wallet" },
  { key: "submitting", label: "Horizon Submission", description: "Broadcasting to Stellar network" },
  { key: "confirming", label: "Ledger Confirmation", description: "Waiting for on-chain finality" },
];

interface TransactionProgressProps<K extends string> {
  /** Ordered steps for this flow (e.g. deposit vs. withdrawal). Defaults to `SETTLEMENT_STEPS`. */
  steps?: ReadonlyArray<ProgressStep<K>>;
  /** Backend-derived status. When omitted, `currentStep` fallback is used for backwards-compat. */
  status?: K | ProgressLifecycleStatus;
  /** Zero-based index into `steps` where failure occurred. Required when status==='failed'. */
  failedStep?: number | null;
  /** @deprecated — prefer `status`. Kept for existing callers migrated incrementally. */
  currentStep?: number;
}

function deriveState<K extends string>(
  steps: ReadonlyArray<ProgressStep<K>>,
  status: K | ProgressLifecycleStatus | undefined,
  failedStep: number | null | undefined,
  currentStep: number | undefined,
): { activeIndex: number; completedUntil: number; failedIndex: number | null; isCompleted: boolean } {
  const total = steps.length;

  // Backwards compat: legacy callers pass only currentStep (0..steps.length)
  if (status === undefined && currentStep !== undefined) {
    // Mirror original semantics: currentStep is the active index, >index = completed
    const active = currentStep;
    const completedUntil = currentStep - 1;
    return { activeIndex: active >= 0 && active < total ? active : -1, completedUntil, failedIndex: null, isCompleted: currentStep >= total };
  }

  const s = status ?? "idle";
  if (s === "completed") {
    return { activeIndex: -1, completedUntil: total - 1, failedIndex: null, isCompleted: true };
  }
  if (s === "failed") {
    const f = typeof failedStep === "number" && failedStep >= 0 && failedStep < total ? failedStep : 0;
    return { activeIndex: -1, completedUntil: f - 1, failedIndex: f, isCompleted: false };
  }
  // idle or a step key — indeterminate spinner on active step, no synthetic auto-advance
  const activeIndex = s === "idle" ? -1 : steps.findIndex((step) => step.key === s);
  return { activeIndex, completedUntil: activeIndex - 1, failedIndex: null, isCompleted: false };
}

/**
 * Renders settlement progress from props only.
 *
 * Intentionally has no `useEffect`, `setInterval`, or any other timer: polling
 * and status transitions are owned by the caller (see `SettlementConfirmation`),
 * so there is no interval to clear on unmount and no background work continues
 * after the component is removed.
 */
export function TransactionProgress<K extends string = SettlementStepKey>({
  // Without `steps`, K falls back to SettlementStepKey, so the default matches.
  steps = SETTLEMENT_STEPS as unknown as ReadonlyArray<ProgressStep<K>>,
  status,
  failedStep,
  currentStep,
}: TransactionProgressProps<K>) {
  const { activeIndex, completedUntil, failedIndex, isCompleted } = deriveState(steps, status, failedStep, currentStep);
  return (
    <div className="space-y-6 py-4" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={isCompleted ? steps.length : Math.max(0, activeIndex + 1)}>
      {steps.map((step, index) => {
        const isCompletedStep = isCompleted || index <= completedUntil;
        const isFailed = failedIndex === index;
        const isActive = activeIndex === index && !isFailed && !isCompleted;
        const isPending = !isCompletedStep && !isFailed && !isActive;

        return (
          <div key={step.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                  isFailed && "bg-destructive/15",
                  isCompletedStep && !isFailed && "bg-success/20 dark:bg-success/10",
                  isActive && "bg-primary/20",
                  isPending && "bg-muted"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isFailed ? (
                  <XCircle className="w-5 h-5 text-destructive" />
                ) : isCompletedStep ? (
                  <CheckCircle2 className="w-5 h-5 text-success dark:text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" aria-label={`${step.label} in progress`} />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-px h-10 mt-1 transition-all duration-500",
                    isCompletedStep && !isFailed ? "bg-success/40 dark:bg-emerald-700" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-semibold transition-colors flex items-center gap-1.5",
                  isFailed && "text-destructive",
                  isCompletedStep && !isFailed && "text-success dark:text-emerald-400",
                  isActive && "text-foreground",
                  isPending && "text-muted-foreground/50"
                )}
              >
                {step.label}
                {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
              </p>
              <p
                className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isFailed && "text-destructive/80",
                  isCompletedStep && !isFailed && "text-success/70 dark:text-emerald-400/70",
                  isActive && "text-muted-foreground",
                  isPending && "text-muted-foreground/40"
                )}
              >
                {isFailed ? "Failed — see error below" : step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
