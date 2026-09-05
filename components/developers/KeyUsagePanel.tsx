"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { formatDistanceToNowStrict } from "date-fns";

interface KeyUsageStatus {
  limit: number;
  remaining: number;
  resetAt: number; // epoch seconds
  unit?: string; // e.g. "req/min"
}

function loadFromStorage(keyId: string) {
  try {
    const raw = localStorage.getItem(`bettapay.keyUsage.${keyId}`);
    if (!raw)
      return [] as Array<{ ts: number; used: number; remaining: number }>;
    return JSON.parse(raw) as Array<{
      ts: number;
      used: number;
      remaining: number;
    }>;
  } catch {
    return [] as Array<{ ts: number; used: number; remaining: number }>;
  }
}

function saveToStorage(
  keyId: string,
  arr: Array<{ ts: number; used: number; remaining: number }>,
) {
  try {
    localStorage.setItem(`bettapay.keyUsage.${keyId}`, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function KeyUsagePanel({ keyId }: { keyId: string }) {
  const [status, setStatus] = useState<KeyUsageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{ ts: number; used: number; remaining: number }>
  >(() => {
    if (typeof window === "undefined") return [];
    return loadFromStorage(keyId).filter(
      (p) => Date.now() - p.ts <= 24 * 60 * 60 * 1000,
    );
  });

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${keyId}/usage`, {
        cache: "no-store",
      });
      if (!res.ok) {
        // try headers fallback
        const limit = Number(res.headers.get("X-RateLimit-Limit"));
        const remaining = Number(res.headers.get("X-RateLimit-Remaining"));
        const resetAt = Number(res.headers.get("X-RateLimit-Reset"));
        const unit = res.headers.get("X-RateLimit-Unit") || undefined;
        if (
          Number.isFinite(limit) &&
          Number.isFinite(remaining) &&
          Number.isFinite(resetAt)
        ) {
          setStatus({ limit, remaining, resetAt, unit });
        } else {
          throw new Error("Unavailable");
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = (await res.json().catch(() => null)) as any;
        if (
          json &&
          (typeof json.limit === "number" || typeof json.remaining === "number")
        ) {
          const limit = Number(
            json.limit ?? res.headers.get("X-RateLimit-Limit"),
          );
          const remaining = Number(
            json.remaining ?? res.headers.get("X-RateLimit-Remaining"),
          );
          const resetAt = Number(
            json.resetAt ?? json.reset ?? res.headers.get("X-RateLimit-Reset"),
          );
          const unit =
            json.unit ?? res.headers.get("X-RateLimit-Unit") ?? undefined;
          if (
            !Number.isFinite(limit) ||
            !Number.isFinite(remaining) ||
            !Number.isFinite(resetAt)
          )
            throw new Error();
          setStatus({ limit, remaining, resetAt: Math.floor(resetAt), unit });
        } else {
          throw new Error("No usage data");
        }
      }
    } catch {
      setError("Usage information is unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [keyId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Persist a snapshot into local storage for simple client-side history
  useEffect(() => {
    if (!status) return;
    const point = {
      ts: Date.now(),
      used: Math.max(0, status.limit - status.remaining),
      remaining: status.remaining,
    };
    const next = [
      ...history.filter((p) => Date.now() - p.ts <= 24 * 60 * 60 * 1000),
      point,
    ];
    setHistory(next);
    saveToStorage(keyId, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const usagePct = useMemo(() => {
    if (!status || status.limit <= 0) return 0;
    return Math.min(
      100,
      Math.max(0, ((status.limit - status.remaining) / status.limit) * 100),
    );
  }, [status]);

  const showWarning = usagePct >= 80;

  // small sparkline path generator
  const sparklinePath = useMemo(() => {
    if (!history.length) return null;
    const w = 120,
      h = 28,
      pad = 2;
    const maxUsed = Math.max(...history.map((p) => p.used), 1);
    return history
      .map((p, i) => {
        const x = Math.round(
          (i / Math.max(1, history.length - 1)) * (w - pad * 2) + pad,
        );
        const y = Math.round(h - ((p.used / maxUsed) * (h - pad * 2) + pad));
        return `${x},${y}`;
      })
      .join(" ");
  }, [history]);

  return (
    <div className="w-full max-w-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Usage</p>
          <p className="text-xs text-muted-foreground">
            Key usage for current window
            {status?.unit ? ` • ${status.unit}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void loadStatus()}
            disabled={isLoading}
            aria-label="Refresh key usage"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-xs text-destructive mt-2">{error}</p>
      ) : status ? (
        <div className="space-y-2 mt-2">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-semibold tabular-nums">
              {status.remaining.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              of {status.limit.toLocaleString()} {status.unit ?? ""}
            </p>
          </div>

          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usagePct)}
          >
            <div
              className={`${showWarning ? "bg-warning" : "bg-primary"} h-full rounded-full transition-all`}
              style={{ width: `${usagePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {Math.round(usagePct)}% used
            </span>
            {showWarning && (
              <span className="flex items-center gap-1 font-medium text-warning">
                <AlertTriangle className="w-3.5 h-3.5" /> Approaching limit
              </span>
            )}
          </div>

          {sparklinePath && (
            <svg
              className="w-full mt-1"
              width="120"
              height="28"
              viewBox="0 0 120 28"
              preserveAspectRatio="none"
              aria-hidden
            >
              <polyline
                fill="none"
                stroke="#CBD5E1"
                strokeWidth={2}
                points={sparklinePath}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          <div className="text-xs text-muted-foreground">
            Resets{" "}
            {status.resetAt
              ? formatDistanceToNowStrict(new Date(status.resetAt * 1000), {
                  addSuffix: true,
                })
              : "—"}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mt-2">Loading…</p>
      )}
    </div>
  );
}
