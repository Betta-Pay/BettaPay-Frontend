"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useId } from "react";
import { MessageCircle, Code2, Briefcase, Mail, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// NewsletterForm
// ---------------------------------------------------------------------------

type SubmitState = "idle" | "loading" | "success" | "error";

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const inputId = useId();
  const helpId = useId();
  const statusId = useId();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "loading") return;

    setState("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Subscription failed. Please try again.");
      }

      setState("success");
      setEmail("");

      // Track successful signup via the RUM pipeline so submission volume
      // is visible in the performance dashboard without a third-party SDK.
      if (typeof window !== "undefined") {
        import("@/lib/rum").then(({ recordRumEvent }) => {
          recordRumEvent("newsletter_signup" as Parameters<typeof recordRumEvent>[0], 1, window.location.pathname);
        }).catch(() => {
          // Non-fatal — analytics must never break the UI
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(message);
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
      >
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        You&apos;re subscribed — expect updates in your inbox soon.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={helpId}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Email address
          </label>
          <Input
            id={inputId}
            type="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state === "error") setState("idle");
            }}
            placeholder="you@company.com"
            required
            autoComplete="email"
            aria-describedby={`${helpId}${state === "error" ? ` ${statusId}` : ""}`}
            aria-invalid={state === "error" ? "true" : undefined}
            className="w-full"
            disabled={state === "loading"}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            disabled={state === "loading"}
            aria-disabled={state === "loading"}
            className="w-full sm:w-auto h-10 font-semibold"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                <span>Subscribing…</span>
              </>
            ) : (
              <>
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Honeypot — hidden from real users, filled by bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        autoComplete="off"
      />

      <p id={helpId} className="mt-1.5 text-xs text-muted-foreground">
        Product updates and release notes only. No spam, unsubscribe any time.
      </p>

      {state === "error" && (
        <p
          id={statusId}
          role="alert"
          aria-live="assertive"
          className="mt-2 flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-border bg-card/60 mt-auto"
    >
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center p-1">
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-foreground">BettaPay</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The next-generation non-custodial payment gateway for African merchants. Accept
              global stablecoin payments and settle directly to your local bank account in
              seconds. Built securely on the Stellar network.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link
                href="/contact"
                className="hover:text-primary transition-colors"
                aria-label="Contact us"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/docs"
                className="hover:text-primary transition-colors"
                aria-label="API Documentation"
              >
                <Code2 className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/about#careers"
                className="hover:text-primary transition-colors"
                aria-label="Careers"
              >
                <Briefcase className="w-5 h-5" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="hover:text-primary transition-colors"
                aria-label="Email us"
              >
                <Mail className="w-5 h-5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Merchant Dashboard
                </Link>
              </li>
              <li>
                <Link href="/payment-links" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Payment Links
                </Link>
              </li>
              <li>
                <Link href="/fiat-settlements" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Fiat Settlements
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Developers</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Integration Guides
                </Link>
              </li>
              <li>
                <Link href="/sdks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  SDKs &amp; Libraries
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Col 3 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-12 pt-10 border-t border-border">
          <div className="max-w-md">
            <h2 className="text-base font-semibold text-foreground mb-1">
              Stay in the loop
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Get notified about new features, integrations, and platform updates.
            </p>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} BettaPay Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/status"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              aria-label="View system status"
            >
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                aria-hidden="true"
              />
              All systems operational
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
