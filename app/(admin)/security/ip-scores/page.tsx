"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fingerprint, Lock, RefreshCcw, Search } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { EmptyState } from "@/components/shared";
import { PageHeader } from "@/components/shared/PageHeader";
import { IpDetailDialog, LiveScoreLine, formatTime, useIpDetail } from "@/components/admin/security/IpDetailDialog";
import { useIpScores } from "@/lib/security/useIpScores";
import { looksLikeIp } from "@/lib/security/clientIp";
import type { IpSummary } from "@/lib/security/types";

function Countdown({ seconds, since }: { seconds: number; since: number }) {
  const [now, setNow] = useState(since);
  useEffect(() => {
    if (seconds <= 0) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [seconds, since]);
  const left = Math.max(0, seconds - Math.floor((now - since) / 1000));
  if (seconds <= 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="font-mono">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </span>
  );
}

function ScoreBar({ score, threshold }: { score: number; threshold: number }) {
  const pct = Math.min(100, Math.round((score / threshold) * 100));
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="Score versus lockout threshold"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={Math.min(score, threshold)}
      >
        <div className={`h-full ${score >= threshold ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-sm">
        {score}/{threshold}
      </span>
    </div>
  );
}

function LiveLookupCard({ ip }: { ip: string }) {
  const { data, error, loading } = useIpDetail(ip);
  return (
    <div className="rounded-xl border border-border p-4" aria-live="polite">
      <h2 className="mb-2 text-sm font-semibold">
        Lookup <span className="font-mono">{ip}</span>
      </h2>
      {loading && !data && <Skeleton className="h-10 w-full" />}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && <LiveScoreLine detail={data} />}
    </div>
  );
}

function IpScoresContent() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("ip") ?? "";
  const [q, setQ] = useState(initial);
  const [selected, setSelected] = useState<string | null>(initial && looksLikeIp(initial) ? initial : null);
  const { data, loading, error, refresh } = useIpScores(q);
  const receivedAt = useRef(Date.now());
  useEffect(() => {
    receivedAt.current = Date.now();
  }, [data]);

  // Typing "1.2.3.4" passes through valid prefixes of longer IPs; wait for a
  // pause before spending a live backend lookup.
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(id);
  }, [q]);
  const exact = looksLikeIp(debouncedQ) && debouncedQ === q ? q.trim() : null;
  const rows: IpSummary[] = data?.data ?? [];

  const select = (ip: string | null) => {
    setSelected(ip);
    router.replace(ip ? `?ip=${encodeURIComponent(ip)}` : "?", { scroll: false });
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Security"
        title="IP reputation"
        description="Auth failure scores, lockouts and attempt history per IP. A score at or above the threshold locks the IP out of auth."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Search IP address"
          className="pl-9 font-mono"
          placeholder="Search or paste a full IP"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {exact && <LiveLookupCard key={exact} ip={exact} />}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading IP scores">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Fingerprint}
          title={q ? "No tracked IPs match" : "No auth activity recorded"}
          description={q ? "Paste a full IP above to look up its live score." : "IPs appear here after auth attempts."}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Retry after</TableHead>
                <TableHead>Last event</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.ip}>
                  <TableCell className="font-mono text-sm">{r.ip}</TableCell>
                  <TableCell>
                    <ScoreBar score={r.cachedScore} threshold={r.threshold} />
                  </TableCell>
                  <TableCell>
                    {r.lockedOut ? (
                      <Badge variant="destructive">
                        <Lock aria-hidden="true" /> Locked out
                      </Badge>
                    ) : r.clearedAt ? (
                      <Badge variant="secondary">Cleared</Badge>
                    ) : (
                      <Badge variant="outline">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Countdown seconds={r.retryAfterSeconds} since={receivedAt.current} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatTime(r.lastEventAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" aria-label={`View attempts for ${r.ip}`} onClick={() => select(r.ip)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selected && <IpDetailDialog ip={selected} onClose={() => select(null)} onCleared={() => void refresh()} />}
    </div>
  );
}

export default function IpScoresPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <IpScoresContent />
    </Suspense>
  );
}
