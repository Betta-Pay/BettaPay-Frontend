import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui";
import type { BatchStatus, SettlementStatus } from "@/lib/batches/types";

const BATCH: Record<BatchStatus, { label: string; icon: LucideIcon; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  created: { label: "Created", icon: Clock, variant: "outline" },
  processing: { label: "Processing", icon: Loader2, variant: "secondary" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  completed_with_failures: { label: "Completed with failures", icon: AlertTriangle, variant: "destructive" },
  failed: { label: "Failed", icon: XCircle, variant: "destructive" },
};

const ITEM: Record<SettlementStatus, { label: string; icon: LucideIcon; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "outline" },
  processing: { label: "Processing", icon: Loader2, variant: "secondary" },
  completed: { label: "Completed", icon: CheckCircle2, variant: "default" },
  failed: { label: "Failed", icon: XCircle, variant: "destructive" },
};

/** Status is always icon + text, never colour alone. */
export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, icon: Icon, variant } = BATCH[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function ItemStatusBadge({ status }: { status: SettlementStatus }) {
  const { label, icon: Icon, variant } = ITEM[status];
  return (
    <Badge variant={variant} className="gap-1">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
