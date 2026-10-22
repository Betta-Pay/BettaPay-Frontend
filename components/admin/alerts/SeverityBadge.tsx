import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertSeverity } from "@/lib/alerts/types";

const META: Record<AlertSeverity, { label: string; Icon: typeof Info; className: string }> = {
  critical: { label: "Critical", Icon: AlertOctagon, className: "bg-destructive/10 text-destructive border-destructive/30" },
  warning: { label: "Warning", Icon: AlertTriangle, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  info: { label: "Info", Icon: Info, className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
};

/** Severity is conveyed by icon and text, never colour alone. */
export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const { label, Icon, className } = META[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
