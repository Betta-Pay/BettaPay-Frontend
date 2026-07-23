"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Gauge, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RateLimitStatus { limit: number; remaining: number; resetAt: number; }

function formatCountdown(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hours, minutes, secs].map((value) => value.toString().padStart(2, "0")).join(":");
}

export function RateLimitDisplay() {
  const [status, setStatus] = useState<RateLimitStatus | null>(null);
  const [secondsUntilReset, setSecondsUntilReset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rate-limit/status", { cache: "no-store" });
      const limit = Number(response.headers.get("X-RateLimit-Limit"));
      const remaining = Number(response.headers.get("X-RateLimit-Remaining"));
      const resetAt = Number(response.headers.get("X-RateLimit-Reset"));
      if (!response.ok || !Number.isFinite(limit) || !Number.isFinite(remaining) || !Number.isFinite(resetAt)) throw new Error();
      setStatus({ limit, remaining, resetAt });
      setSecondsUntilReset(Math.max(0, resetAt - Math.floor(Date.now() / 1000)));
    } catch {
      setError("Rate limit status is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (!status) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, status.resetAt - Math.floor(Date.now() / 1000));
      setSecondsUntilReset(remaining);
      if (remaining === 0) void loadStatus();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loadStatus, status]);

  const usagePercentage = useMemo(() => {
    if (!status || status.limit <= 0) return 0;
    return Math.min(100, Math.max(0, ((status.limit - status.remaining) / status.limit) * 100));
  }, [status]);
  const showWarning = usagePercentage >= 80;

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold"><Gauge className="h-4 w-4 text-primary" /> API rate limit</CardTitle>
          <CardDescription>Current request allowance for this API client.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => void loadStatus()} disabled={isLoading} aria-label="Refresh rate limit status">
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite">
        {error ? <p className="text-sm text-destructive">{error}</p> : status ? <>
          <div className="flex items-end justify-between gap-4">
            <div><p className="text-3xl font-bold tabular-nums">{status.remaining.toLocaleString()}</p><p className="text-xs text-muted-foreground">requests remaining of {status.limit.toLocaleString()}</p></div>
            <div className="text-right"><p className="font-mono text-sm font-semibold tabular-nums">{formatCountdown(secondsUntilReset)}</p><p className="text-xs text-muted-foreground">until reset</p></div>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="API rate limit usage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(usagePercentage)}>
            <div className={`h-full rounded-full transition-all ${showWarning ? "bg-warning" : "bg-primary"}`} style={{ width: `${usagePercentage}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{Math.round(usagePercentage)}% used</span>
            {showWarning && <span className="flex items-center gap-1 font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Approaching rate limit</span>}
          </div>
        </> : <p className="text-sm text-muted-foreground">Loading rate limit status…</p>}
      </CardContent>
    </Card>
  );
}
