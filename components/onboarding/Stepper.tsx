import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { steps: string[]; currentStep: number; onStepClick: (step: number) => void };

export function Stepper({ steps, currentStep, onStepClick }: Props) {
  return <ol className="grid grid-cols-5 gap-1" aria-label="Onboarding progress">
    {steps.map((label, index) => {
      const complete = index < currentStep;
      const active = index === currentStep;
      return <li key={label} className="min-w-0">
        <button type="button" onClick={() => onStepClick(index)} className="group w-full text-left" aria-current={active ? "step" : undefined}>
          <span className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold", complete && "border-primary bg-primary text-primary-foreground", active && "border-primary text-primary", !complete && !active && "border-muted-foreground/30 text-muted-foreground")}>{complete ? <Check className="h-4 w-4" /> : index + 1}</span>
          <span className={cn("block truncate text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        </button>
      </li>;
    })}
  </ol>;
}
