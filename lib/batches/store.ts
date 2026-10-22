import type { BatchSettlement, SettlementBatch, SettlementStatus } from "./types";
import type { BatchSummary, BatchPage } from "./types";
import { summarizeBatch } from "./derive";

interface BatchStore {
  batches: SettlementBatch[];
  settlements: BatchSettlement[];
}

const g = globalThis as unknown as { __bpBatches?: BatchStore };

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

function s(
  id: string,
  batchId: string,
  asset: string,
  gross: string,
  feeBps: number,
  status: SettlementStatus,
  initiatedMinAgo: number,
  completedMinAgo: number | null,
  supersededById: string | null = null,
  merchantId = "merch-001",
): BatchSettlement {
  // Integer arithmetic on stroop-like scaled values keeps fees exact.
  const [i, f = ""] = gross.split(".");
  const scaled = BigInt(i + f.padEnd(7, "0"));
  const fee = (scaled * BigInt(feeBps)) / BigInt(10000);
  const fmt = (v: bigint) => {
    const str = v.toString().padStart(8, "0");
    return `${str.slice(0, -7)}.${str.slice(-7)}`;
  };
  return {
    id,
    merchantId,
    totalAmount: gross,
    grossAmount: fmt(scaled),
    feeAmount: fmt(fee),
    netAmount: fmt(scaled - fee),
    feeBps,
    asset,
    status,
    batchId,
    initiatedAt: ago(initiatedMinAgo),
    completedAt: completedMinAgo === null ? null : ago(completedMinAgo),
    supersededById,
  };
}

function totals(members: BatchSettlement[]) {
  // Totals count each original once: skip rows that were superseded.
  const live = members.filter((m) => !m.supersededById);
  const sum = (pick: (m: BatchSettlement) => string) =>
    live.reduce((acc, m) => acc + BigInt(pick(m).replace(".", "")), BigInt(0));
  const fmt = (v: bigint) => {
    const str = v.toString().padStart(8, "0");
    return `${str.slice(0, -7)}.${str.slice(-7)}`;
  };
  return {
    totalCount: live.length,
    totalGross: fmt(sum((m) => m.grossAmount)),
    totalFees: fmt(sum((m) => m.feeAmount)),
    totalNet: fmt(sum((m) => m.netAmount)),
  };
}

function seed(): BatchStore {
  const settlements: BatchSettlement[] = [
    // bat_retry: A failed -> B failed -> C completed, plus a clean member.
    s("stl_a1", "bat_retry", "USDC", "1200.0000000", 100, "failed", 300, null, "stl_a2"),
    s("stl_a2", "bat_retry", "USDC", "1200.0000000", 100, "failed", 240, null, "stl_a3"),
    s("stl_a3", "bat_retry", "USDC", "1200.0000000", 100, "completed", 180, 175),
    s("stl_a4", "bat_retry", "USDC", "560.2500000", 100, "completed", 300, 296, null, "merch-002"),
    // bat_proc: still processing.
    s("stl_p1", "bat_proc", "XLM", "5000.0000000", 150, "processing", 20, null),
    s("stl_p2", "bat_proc", "XLM", "750.5000000", 150, "completed", 20, 15, null, "merch-003"),
    s("stl_p3", "bat_proc", "XLM", "90.0000000", 150, "pending", 20, null, null, "merch-004"),
    // bat_done: fully completed.
    s("stl_d1", "bat_done", "USDC", "300.0000000", 100, "completed", 1500, 1495),
    s("stl_d2", "bat_done", "USDC", "45.1000000", 100, "completed", 1500, 1494, null, "merch-005"),
    // bat_new: nothing started.
    s("stl_n1", "bat_new", "USDT", "800.0000000", 120, "pending", 3, null),
    s("stl_n2", "bat_new", "USDT", "120.0000000", 120, "pending", 3, null, null, "merch-002"),
    // bat_mixed: finished with a terminal failure.
    s("stl_m1", "bat_mixed", "USDC", "2000.0000000", 100, "completed", 2900, 2895),
    s("stl_m2", "bat_mixed", "USDC", "640.0000000", 100, "failed", 2900, null, null, "merch-003"),
  ];
  const mk = (id: string, createdMin: number, processedMin: number | null): SettlementBatch => {
    const members = settlements.filter((m) => m.batchId === id);
    return {
      id,
      asset: members[0].asset,
      ...totals(members),
      createdAt: ago(createdMin),
      processedAt: processedMin === null ? null : ago(processedMin),
    };
  };
  return {
    settlements,
    batches: [
      mk("bat_new", 4, null),
      mk("bat_proc", 25, null),
      mk("bat_retry", 310, 170),
      mk("bat_done", 1510, 1490),
      mk("bat_mixed", 2910, 2890),
    ],
  };
}

export function getBatchStore(): BatchStore {
  if (!g.__bpBatches) g.__bpBatches = seed();
  return g.__bpBatches;
}

export function resetBatchStore(next?: BatchStore): void {
  g.__bpBatches = next ?? seed();
}

export function membersOf(batchId: string): BatchSettlement[] {
  return getBatchStore().settlements.filter((m) => m.batchId === batchId);
}

export function getBatch(id: string): SettlementBatch | undefined {
  return getBatchStore().batches.find((b) => b.id === id);
}

/** Newest first; ties break on id so pages never overlap. */
const desc = (a: SettlementBatch, b: SettlementBatch) =>
  a.createdAt !== b.createdAt ? (a.createdAt < b.createdAt ? 1 : -1) : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;

export function listBatches(opts: {
  asset?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
}): BatchPage {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  let rows: BatchSummary[] = getBatchStore()
    .batches.slice()
    .sort(desc)
    .map((b) => summarizeBatch(b, membersOf(b.id)));
  if (opts.asset) rows = rows.filter((b) => b.asset === opts.asset);
  if (opts.status) rows = rows.filter((b) => b.status === opts.status);

  let start = 0;
  if (opts.cursor) {
    try {
      const [ts, id] = JSON.parse(Buffer.from(opts.cursor, "base64url").toString("utf8")) as [string, string];
      start = rows.findIndex((b) => b.createdAt < ts || (b.createdAt === ts && b.id < id));
      if (start === -1) start = rows.length;
    } catch {
      start = 0;
    }
  }
  const data = rows.slice(start, start + limit);
  const last = data[data.length - 1];
  const hasNextPage = start + limit < rows.length;
  return {
    data,
    total: rows.length,
    nextCursor: last && hasNextPage ? Buffer.from(JSON.stringify([last.createdAt, last.id])).toString("base64url") : null,
    pageInfo: { limit, total: rows.length, hasNextPage },
  };
}
