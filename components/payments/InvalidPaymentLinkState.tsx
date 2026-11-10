"use client";

import { useEffect, useState } from "react";
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
  /** Optional merchant contact email to render a "Contact Merchant" mailto action. */
  merchantEmail?: string;
  /** Safe destination URL for the return button and auto-redirect timer (defaults to "/"). */
  returnUrl?: string;
  /** Countdown duration in seconds before automatically redirecting to `returnUrl` (defaults to 10). */
  redirectSeconds?: number;
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
  merchantEmail,
  returnUrl = "/",
  redirectSeconds = 10,
  onRetry,
}: InvalidPaymentLinkStateProps) {
  const router = useRouter();
  const { icon: Icon, title, description } = REASON_COPY[reason];
  const [secondsLeft, setSecondsLeft] = useState<number>(
    redirectSeconds > 0 ? Math.ceil(redirectSeconds) : 0,
  );

  const goHome = () => router.push(returnUrl);

  useEffect(() => {
    setSecondsLeft(redirectSeconds > 0 ? Math.ceil(redirectSeconds) : 0);
  }, [redirectSeconds]);

  useEffect(() => {
    if (redirectSeconds <= 0) return;
    if (secondsLeft <= 0) {
      router.push(returnUrl);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, redirectSeconds, returnUrl, router]);

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

      <div
        className="mt-4 flex flex-col items-center gap-3 text-center"
        data-testid="invalid-link-guidance"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          {merchantEmail ? (
            <a
              href={`mailto:${merchantEmail}`}
              className="inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              Contact Merchant
            </a>
          ) : null}
          <button
            type="button"
            onClick={goHome}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {redirectSeconds > 0
              ? `Return to homepage (${secondsLeft}s)`
              : "Return to homepage"}
          </button>
        </div>
        {redirectSeconds > 0 ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Redirecting in {secondsLeft}s…
          </p>
        ) : null}
      </div>

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
