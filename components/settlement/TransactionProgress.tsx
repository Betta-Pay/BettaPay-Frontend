"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

interface TransactionProgressProps {
  currentStep: number;
}

const STEPS = [
  { label: "Freighter Signing", description: "Sign transaction in your Freighter wallet" },
  { label: "Horizon Submission", description: "Broadcasting to Stellar network" },
  { label: "Ledger Confirmation", description: "Waiting for on-chain finality" },
];

export const TransactionProgress = ({ currentStep }: TransactionProgressProps) => {
  return (
    <div className="space-y-6 py-4">
      {STEPS.map((step, index) => {
        const isActive = currentStep === index;
        const isCompleted = currentStep > index;
        const isPending = currentStep < index;

        return (
          <div key={step.label} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                  isCompleted && "bg-success/20 dark:bg-success/10",
                  isActive && "bg-primary/20",
                  isPending && "bg-muted"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-success dark:text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-px h-10 mt-1 transition-all duration-500",
                    isCompleted ? "bg-success/40 dark:bg-emerald-700" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pt-1">
              <p
                className={cn(
                  "text-sm font-semibold transition-colors",
                  isCompleted && "text-success dark:text-emerald-400",
                  isActive && "text-foreground",
                  isPending && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </p>
              <p
                className={cn(
                  "text-xs mt-0.5 transition-colors",
                  isCompleted && "text-success/70 dark:text-emerald-400/70",
                  isActive && "text-muted-foreground",
                  isPending && "text-muted-foreground/40"
                )}
              >
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
