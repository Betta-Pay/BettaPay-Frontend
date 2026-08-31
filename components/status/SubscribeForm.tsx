"use client";

import { useState } from "react";
import { Mail, Rss, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNotify } from "@/lib/hooks/useNotify";
import { subscriberEmailSchema } from "@/lib/status/subscribers";

type FormState = "idle" | "submitting" | "subscribed" | "duplicate";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;

    // Validate with the same schema the route uses, so an obviously bad
    // address never costs a round trip.
    const parsed = subscriberEmailSchema.safeParse(email);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Enter a valid email address.";
      setError(message);
      notify.error(message);
      return;
    }

    setError(null);
    setState("submitting");

    try {
      const res = await fetch("/api/status/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data }),
      });

      const body = (await res.json().catch(() => null)) as
        | { status?: string; message?: string; error?: string }
        | null;

      // Anything other than a confirmed write is a failure. The success toast
      // fires only below, after the server has acknowledged the record.
      if (!res.ok) {
        const message =
          body?.error ?? "We couldn't save your subscription. Please try again.";
        setError(message);
        notify.error(message);
        setState("idle");
        return;
      }

      if (body?.status === "duplicate") {
        const message = body.message ?? "That email is already subscribed.";
        setState("duplicate");
        notify.info(message);
        return;
      }

      setState("subscribed");
      notify.success(body?.message ?? "You're subscribed to status updates.");
    } catch {
      const message = "We couldn't reach the status service. Please try again.";
      setError(message);
      notify.error(message);
      setState("idle");
    }
  };

  if (state === "subscribed" || state === "duplicate") {
    return (
      <div
        className="flex items-center gap-2 text-status-ok text-sm font-semibold"
        role="status"
      >
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        {state === "duplicate"
          ? "That email is already subscribed. We'll notify you of any status changes."
          : "You're subscribed. We'll notify you of any status changes."}
      </div>
    );
  }

  const submitting = state === "submitting";

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-1.5 flex-1 w-full sm:w-auto"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={submitting}
              aria-label="Email address for status updates"
              aria-invalid={error !== null}
              aria-describedby={error ? "subscribe-error" : undefined}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden="true" />
                Subscribing
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
        {error && (
          <p id="subscribe-error" role="alert" className="text-xs text-status-down">
            {error}
          </p>
        )}
      </form>
      <a
        href="/api/status/feed"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Rss className="w-3 h-3" aria-hidden="true" />
        RSS Feed
      </a>
    </div>
  );
}
