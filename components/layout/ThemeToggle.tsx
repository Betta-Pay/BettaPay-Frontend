"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeOption {
  value: "light" | "dark" | "system";
  label: string;
  Icon: React.ElementType;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light",  label: "Light",  Icon: Sun     },
  { value: "dark",   label: "Dark",   Icon: Moon    },
  { value: "system", label: "System", Icon: Monitor },
];

function themeLabel(t: string | undefined): string {
  return THEME_OPTIONS.find((o) => o.value === t)?.label ?? "System";
}

/**
 * ThemeToggle
 *
 * Renders a dropdown that lets the user explicitly pick Light / Dark / System.
 * - Each item carries aria-checked so screen readers announce the active choice.
 * - The trigger icon always reflects the *current* active state (not the next state).
 * - No light-flash: the trigger renders null before hydration; the
 *   suppressHydrationWarning on <html> prevents the mismatch warning.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const current = THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2];
  const CurrentIcon = current.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isMounted
                ? `Current theme: ${themeLabel(theme)}. Change theme`
                : "Change theme"
            }
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl min-h-[44px] min-w-[44px]"
          >
            {isMounted ? (
              <CurrentIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              /* skeleton — same size, invisible, no layout shift */
              <span className="h-4 w-4 block" aria-hidden="true" />
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="rounded-xl border-border">
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            role="menuitemradio"
            aria-checked={isMounted && theme === value}
            onClick={() => setTheme(value)}
            className="cursor-pointer rounded-lg gap-2"
            data-active={isMounted && theme === value ? "true" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
            {isMounted && theme === value && (
              <span className="ml-auto text-primary" aria-hidden="true">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
