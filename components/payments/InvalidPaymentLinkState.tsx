"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CloudOff, TimerOff, Unlink, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared";

/** Why the payment link could not be shown. */
export type InvalidLinkReason = "not-found" | "expired" | "error";

interface ReasonCopy {
  icon: LucideIcon;
  title: string;
  description: string;
}

const REASON_COPY: Record<InvalidLinkReason, ReasonCopy> = {
  "not-found": {
    icon: Unlink,
    title: "This payment link is no longer valid",
    description:
      "This link doesn't exist or was revoked by the merchant. Double-check the link you were sent, or ask the merchant for a new one.",
  },
  expired: {
    icon: TimerOff,
    title: "This payment link has expired",
    description:
      "This payment request is no longer open for payment. Please ask the merchant to issue a new link.",
  },
  error: {
    icon: CloudOff,
    title: "We couldn't load this payment link",
    description:
      "Something went wrong while contacting the payment service. Check your connection and try again.",
  },
};

export interface InvalidPaymentLinkStateProps {
  reason: InvalidLinkReason;
  /** The unresolved link id, shown as a support reference when available. */
  linkId?: string;
  /**
   * Called when the user retries after a transient failure. When provided
   * (reason === "error"), it becomes the primary action; otherwise the only
   * action sends the visitor back to the homepage.
   */
  onRetry?: () => void;
}

/**
 * Branded empty state for payment links that cannot be fulfilled.
 *
 * Rendered instead of the payment form so an invalid or expired link never
 * surfaces a raw 404 or an unhandled exception (issue #741).
 */
export function InvalidPaymentLinkState({
  reason,
  linkId,
  onRetry,
}: InvalidPaymentLinkStateProps) {
  const router = useRouter();
  const { icon: Icon, title, description } = REASON_COPY[reason];

  const goHome = () => router.push("/");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
      data-testid="invalid-link-state"
    >
      {/* BettaPay brand mark — keeps the failure state on-brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
          <Image
            src="/logo.png"
            alt="BettaPay logo"
            width={64}
            height={64}
            priority={true}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-sm font-semibold mt-3">BettaPay</p>
      </div>

      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        action={onRetry ? { label: "Try again", onClick: onRetry } : { label: "Go to homepage", onClick: goHome }}
        secondaryAction={onRetry ? { label: "Go to homepage", onClick: goHome } : undefined}
      />

      {linkId ? (
        <div className="mt-8 mx-auto max-w-xs rounded-lg border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Reference:{" "}
            <span className="font-mono break-all text-foreground">{linkId}</span>
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
