"use client";

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, PackageCheck, RefreshCcw } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
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
import { BatchStatusBadge } from "@/components/admin/batches/BatchStatusBadge";
import { BatchDetailDialog } from "@/components/admin/batches/BatchDetailDialog";
import { formatMoney } from "@/lib/batches/derive";
import type { BatchPage } from "@/lib/batches/types";

const PAGE_SIZE = 10;
const ASSETS = ["USDC", "XLM", "USDT"];
const STATUSES: [string, string][] = [
  ["created", "Created"],
  ["processing", "Processing"],
  ["completed", "Completed"],
  ["completed_with_failures", "Completed with failures"],
  ["failed", "Failed"],
];

async function fetchBatches(params: { asset: string; status: string; cursor: string | null }): Promise<BatchPage> {
  const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (params.asset) qs.set("asset", params.asset);
  if (params.status) qs.set("status", params.status);
  if (params.cursor) qs.set("cursor", params.cursor);
  const res = await fetch(`/api/admin/batches?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Couldn't load batches");
  return res.json();
}

function BatchesView() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const openId = search.get("batch");

  const [asset, setAsset] = useState("");
  const [status, setStatus] = useState("");
  // Cursor stack: the last entry is the current page's cursor.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];

  const q = useQuery({
    queryKey: ["admin", "batches", { asset, status, cursor }],
    queryFn: () => fetchBatches({ asset, status, cursor }),
    // Backend status is the source of truth; keep it fresh while visible.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    placeholderData: (prev) => prev,
  });

  const setFilter = (apply: () => void) => {
    apply();
    setCursors([null]);
  };

  const openBatch = (id: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (id) next.set("batch", id);
    else next.delete("batch");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const rows = q.data?.data ?? [];

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        preTitle="Settlements"
        title="Settlement batches"
        description="Batch composition, per-settlement status and retry chains, straight from recorded settlement state."
        actions={
          <Button variant="outline" size="sm" onClick={() => void q.refetch()} disabled={q.isFetching}>
            <RefreshCcw className={`mr-1.5 h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Asset
          <select
            className="h-10 rounded-lg border bg-background px-2 text-sm"
            value={asset}
            onChange={(e) => setFilter(() => setAsset(e.target.value))}
          >
            <option value="">All assets</option>
            {ASSETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Status
          <select
            className="h-10 rounded-lg border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setFilter(() => setStatus(e.target.value))}
          >
            <option value="">All statuses</option>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q.isError && (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load batches</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void q.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {q.isLoading ? (
        <div className="space-y-2" role="status" aria-busy="true" aria-label="Loading batches">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : !q.isError && rows.length === 0 ? (
        <EmptyState icon={PackageCheck} title="No batches match" description="Try a different asset or status." />
      ) : (
        !q.isError && (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Settlements</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => openBatch(b.id)}
                          className="font-mono text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          aria-label={`Open batch ${b.id}`}
                        >
                          {b.id}
                        </button>
                      </TableCell>
                      <TableCell>{b.asset}</TableCell>
                      <TableCell className="tabular-nums">{b.totalCount}</TableCell>
                      <TableCell className="tabular-nums">{formatMoney(b.totalGross)}</TableCell>
                      <TableCell className="tabular-nums">{formatMoney(b.totalFees)}</TableCell>
                      <TableCell className="tabular-nums">{formatMoney(b.totalNet)}</TableCell>
                      <TableCell>
                        <BatchStatusBadge status={b.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(b.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <nav className="flex items-center justify-between" aria-label="Pagination">
              <p className="text-sm text-muted-foreground" role="status">
                {q.data?.total ?? 0} batch{q.data?.total === 1 ? "" : "es"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cursors.length <= 1}
                  onClick={() => setCursors((c) => c.slice(0, -1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!q.data?.nextCursor}
                  onClick={() => q.data?.nextCursor && setCursors((c) => [...c, q.data!.nextCursor])}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          </>
        )
      )}

      {openId && <BatchDetailDialog batchId={openId} onClose={() => openBatch(null)} />}
    </div>
  );
}

export default function AdminBatchesPage() {
  return (
    <Suspense fallback={null}>
      <BatchesView />
    </Suspense>
  );
}
