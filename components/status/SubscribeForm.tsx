"use client";

import { useState } from "react";
import { Mail, Rss, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
        <CheckCircle2 className="w-4 h-4" />
        You&apos;re subscribed. We&apos;ll notify you of any status changes.
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start gap-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Email address for status updates"
            className="pl-9"
          />
        </div>
        <Button type="submit" size="sm">
          Subscribe
        </Button>
      </form>
      <a
        href="/api/status/feed"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <Rss className="w-3 h-3" />
        RSS Feed
      </a>
    </div>
  );
}
