import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role"> & {
  checked?: boolean;
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  label?: string;
  role?: "switch" | "button";
};

function Toggle({
  checked,
  pressed,
  onPressedChange,
  label,
  className,
  disabled,
  onClick,
  onKeyDown,
  role = "switch",
  ...props
}: ToggleProps) {
  const isPressed = Boolean(pressed ?? checked);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onPressedChange?.(!isPressed);
    onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) return;

    if (
      event.key === " " ||
      event.key === "Spacebar" ||
      event.key === "Enter"
    ) {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-xs font-semibold text-muted-foreground">
        {isPressed ? "On" : "Off"}
      </span>
      <button
        type="button"
        role={role}
        aria-checked={isPressed}
        aria-pressed={isPressed}
        aria-label={label}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isPressed ? "bg-primary" : "bg-muted",
          className
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            isPressed ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export { Toggle };
