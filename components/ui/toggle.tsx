import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  checked: boolean;
  label: string;
};

function Toggle({ checked, label, className, ...props }: ToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-xs font-semibold text-slate-500">
        {checked ? "On" : "Off"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          checked ? "bg-amber-500" : "bg-slate-300",
          className
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export { Toggle };
