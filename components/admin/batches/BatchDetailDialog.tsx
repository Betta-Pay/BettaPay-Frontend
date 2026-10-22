"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/batches/derive";
import type { BatchDetail, BatchSettlement, BatchStatus } from "@/lib/batches/types";
import { BatchStatusBadge, ItemStatusBadge } from "./BatchStatusBadge";

async function fetchDetail(id: string): Promise<BatchDetail> {
  const res = await fetch(`/api/admin/batches/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(res.status === 404 ? "Batch not found" : "Couldn't load batch");
  return (await res.json()).data as BatchDetail;
}

const STEPS = ["Created", "Processing", "Completed"] as const;

/** Which step is current, taken from the derived (real) batch status. */
function stepIndex(status: BatchStatus): number {
  if (status === "created") return 0;
  if (status === "processing") return 1;
  return 2;
}

function Stepper({ status }: { status: BatchStatus }) {
  const current = stepIndex(status);
  const finalLabel =
    status === "failed" ? "Failed" : status === "completed_with_failures" ? "Completed with failures" : "Completed";
  return (
    <ol className="flex items-center gap-2" aria-label="Batch progress">
      {STEPS.map((label, i) => {
        const done = i < current || (i === 2 && current === 2);
        const active = i === current && !done;
        return (
          <li
            key={label}
            className="flex items-center gap-2 text-sm"
            aria-current={i === current ? "step" : undefined}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn(i === current ? "font-semibold" : "text-muted-foreground")}>
              {i === 2 ? finalLabel : label}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function Chain({ chain, byId }: { chain: string[]; byId: Map<string, BatchSettlement> }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Retry chain">
      {chain.map((id, i) => {
        const row = byId.get(id);
        const superseded = i < chain.length - 1;
        return (
          <li key={id} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
                superseded ? "border-dashed bg-muted/50 text-muted-foreground" : "border-border",
              )}
            >
              <span className="font-mono">{id}</span>
              {row && <ItemStatusBadge status={row.status} />}
              {superseded && <span className="font-medium">superseded</span>}
              {i === 0 && chain.length > 1 && <span className="font-medium">original</span>}
              {i > 0 && <span className="font-medium">retry {i}</span>}
            </span>
            {i < chain.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export function BatchDetailDialog({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ["admin", "batches", batchId], queryFn: () => fetchDetail(batchId), retry: false });
  const d = q.data;
  const byId = new Map((d?.members ?? []).map((m) => [m.id, m as BatchSettlement]));
  const retried = (d?.chains ?? []).filter((c) => c.length > 1);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Batch <span className="font-mono">{batchId}</span>
          </DialogTitle>
          <DialogDescription>
            Status is derived from the settlements&apos; recorded states and the batch&apos;s processed time.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading && (
          <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading batch">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {q.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              <p>{(q.error as Error).message}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void q.refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {d && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Stepper status={d.status} />
              <BatchStatusBadge status={d.status} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Asset", d.asset],
                ["Gross", formatMoney(d.totalGross)],
                ["Fees", formatMoney(d.totalFees)],
                ["Net", formatMoney(d.totalNet)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="batch-timeline">
              <h3 id="batch-timeline" className="mb-2 text-sm font-semibold">
                Timeline
              </h3>
              <ol className="space-y-1.5 border-l pl-4">
                {d.timeline.map((e) => (
                  <li key={e.key} className="text-sm">
                    <span className="font-medium">{e.label}</span>{" "}
                    <time dateTime={e.at} className="text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ol>
            </section>

            {retried.length > 0 && (
              <section aria-labelledby="batch-retries" data-testid="retry-chains">
                <h3 id="batch-retries" className="mb-2 text-sm font-semibold">
                  Retry chains
                </h3>
                <div className="space-y-2">
                  {retried.map((c) => (
                    <Chain key={c[0].id} chain={c.map((x) => x.id)} byId={byId} />
                  ))}
                </div>
              </section>
            )}

            <section aria-labelledby="batch-members">
              <h3 id="batch-members" className="mb-2 text-sm font-semibold">
                Settlements ({d.members.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Retry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.members.map((m) => (
                      <TableRow key={m.id} className={cn(m.superseded && "bg-muted/40")}>
                        <TableCell>
                          <Link
                            href={`/admin/transactions?settlement=${encodeURIComponent(m.id)}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {m.id}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs">{m.merchantId}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(m.netAmount)} {m.asset}
                        </TableCell>
                        <TableCell>
                          <ItemStatusBadge status={m.status} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.superseded ? (
                            <span>
                              Superseded by <span className="font-mono">{m.supersededById}</span>
                            </span>
                          ) : m.chain.length > 1 ? (
                            <span>Latest attempt ({m.chain.length})</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
