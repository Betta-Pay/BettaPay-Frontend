"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;

type State =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; email: string; expiresInSeconds: number }
  | { status: "error"; message: string };

export interface MagicLinkFormProps {
  /** Cooldown duration in seconds after dispatching a magic link (defaults to 60s). */
  resendCooldownSeconds?: number;
}

/**
 * "Email me a magic link" option for the login page (issue #466). Sits
 * alongside the password and wallet paths, which are unchanged.
 */
export function MagicLinkForm({
  resendCooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
}: MagicLinkFormProps = {}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  async function dispatchMagicLink(targetEmail: string, isResend = false) {
    const trimmed = targetEmail.trim();
    if (!trimmed) return;
    if (isResend && (cooldown > 0 || isResending)) return;

    if (isResend) {
      setIsResending(true);
    } else {
      setState({ status: "sending" });
    }

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        expiresInSeconds?: number;
      };
      if (!res.ok) {
        setState({
          status: "error",
          message: body.error ?? "Could not send the link. Try again.",
        });
        return;
      }
      setState({
        status: "sent",
        email: trimmed,
        expiresInSeconds: body.expiresInSeconds ?? 900,
      });
      setCooldown(resendCooldownSeconds);
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    } finally {
      setIsResending(false);
    }
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    await dispatchMagicLink(email, false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
      >
        <Mail className="w-4 h-4" aria-hidden="true" />
        Email me a magic link
      </button>
    );
  }

  if (state.status === "sent") {
    const minutes = Math.max(1, Math.round(state.expiresInSeconds / 60));
    const isCooldownActive = cooldown > 0;
    return (
      <div
        className="rounded-xl border border-border bg-muted/40 p-4 text-sm"
        role="status"
        aria-live="polite"
      >
        <p className="flex items-center gap-2 font-medium text-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
          Check your inbox
        </p>
        <p className="mt-1 text-muted-foreground">
          If <span className="font-medium text-foreground">{state.email}</span> has an
          account, a sign-in link is on its way. It expires in about {minutes} minute
          {minutes === 1 ? "" : "s"} and can only be used once.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isCooldownActive || isResending}
            aria-disabled={isCooldownActive || isResending}
            onClick={() => void dispatchMagicLink(state.email, true)}
            className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
          >
            {isCooldownActive
              ? `Resend link in ${cooldown}s`
              : isResending
                ? "Sending..."
                : "Resend link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCooldown(0);
              setState({ status: "idle" });
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-2">
      <label htmlFor="magic-link-email" className="text-xs font-medium text-muted-foreground">
        Email address
      </label>
      <input
        id="magic-link-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      {state.status === "error" && (
        <p className="text-xs text-destructive" role="alert">
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={state.status === "sending"}
          className="flex-1 h-11 rounded-xl"
        >
          {state.status === "sending" ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            "Send link"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setCooldown(0);
            setState({ status: "idle" });
          }}
          className="h-11 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
