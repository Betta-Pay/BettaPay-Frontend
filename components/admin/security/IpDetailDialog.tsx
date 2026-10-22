"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@/components/ui";
import { useNotify } from "@/lib/hooks/useNotify";
import type { ClearResponse, IpDetailResponse } from "@/lib/security/types";

export function formatTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

/** Fetch one IP's live score + attempt stream. */
export function useIpDetail(ip: string | null) {
  const [data, setData] = useState<IpDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!ip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/security/ip-scores/${encodeURIComponent(ip)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Lookup returned ${res.status}`);
      setData((await res.json()) as IpDetailResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }, [ip]);

  useEffect(() => {
    setData(null);
    setError(null);
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

export function LiveScoreLine({ detail }: { detail: IpDetailResponse }) {
  const { live, liveError, summary } = detail;
  return (
    <div className="space-y-1 text-sm" data-testid="score-sources">
      {live ? (
        <p>
          <Badge variant="default">Live from backend</Badge>{" "}
          <span className="font-mono font-semibold">{live.score}</span>
          <span className="text-muted-foreground"> / {summary.threshold} · fetched {formatTime(live.fetchedAt)}</span>
        </p>
      ) : (
        <p className="text-destructive">Live score unavailable: {liveError}</p>
      )}
      <p>
        <Badge variant="secondary">Cached</Badge>{" "}
        <span className="font-mono font-semibold">{summary.cachedScore}</span>
        <span className="text-muted-foreground"> from {summary.failures} failures and {summary.successes} successes seen by this console</span>
      </p>
    </div>
  );
}

export function IpDetailDialog({
  ip,
  onClose,
  onCleared,
}: {
  ip: string;
  onClose: () => void;
  onCleared: () => void;
}) {
  const notify = useNotify();
  const { data, error, loading, reload } = useIpDetail(ip);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  const clear = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/admin/security/ip-scores/${encodeURIComponent(ip)}/clear`, { method: "POST" });
      if (!res.ok) throw new Error(`Clear returned ${res.status}`);
      const body = (await res.json()) as ClearResponse;
      if (body.backendCleared) {
        notify.success(`Score for ${ip} cleared. The backend confirmed it. Audit entry recorded.`);
      } else {
        notify.info(`Score for ${ip} cleared in this console and audited. The backend did not confirm: ${body.backendNote ?? "no response"}.`);
      }
      setConfirming(false);
      await reload();
      onCleared();
    } catch (err) {
      notify.error(`Couldn't clear ${ip}: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{ip}</DialogTitle>
          <DialogDescription>Auth attempt history and reputation score.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && !data && <Skeleton className="h-32 w-full" />}

        {data && (
          <div className="space-y-4">
            <LiveScoreLine detail={data} />
            {data.summary.clearedAt && (
              <Alert variant="success">
                <CheckCircle2 aria-hidden="true" />
                <AlertDescription>
                  Cleared {formatTime(data.summary.clearedAt)} by {data.summary.clearedBy}. Score is{" "}
                  <strong>{data.summary.cachedScore}</strong>, not locked out.
                </AlertDescription>
              </Alert>
            )}
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Auth attempts for {ip}, newest first</caption>
                <thead className="sticky top-0 bg-muted text-left text-xs">
                  <tr>
                    <th className="p-2">Time</th>
                    <th className="p-2">Outcome</th>
                    <th className="p-2">Endpoint</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.attempts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        No attempts recorded.
                      </td>
                    </tr>
                  )}
                  {data.attempts.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{formatTime(a.at)}</td>
                      <td className="p-2">
                        {a.outcome === "failure" ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Failure
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Success
                          </span>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">{a.endpoint}</td>
                      <td className="p-2">{a.statusCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {confirming && (
          <Alert variant="warning">
            <ShieldAlert aria-hidden="true" />
            <AlertDescription>
              <p>
                Clear the score for <span className="font-mono">{ip}</span>? The action is written to the audit log. The
                backend has no clear endpoint yet, so it may not confirm.
              </p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => void clear()} disabled={clearing}>
                  {clearing ? "Clearing…" : "Yes, clear score"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={clearing}>
                  Cancel
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="destructive" onClick={() => setConfirming(true)} disabled={!data || confirming}>
            Clear score
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
