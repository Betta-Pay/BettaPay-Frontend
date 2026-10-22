import type {
  BatchDetail,
  BatchSettlement,
  BatchStatus,
  BatchSummary,
  MemberDetail,
  SettlementBatch,
  SettlementStatus,
  TimelineEvent,
} from "./types";

const emptyCounts = (): Record<SettlementStatus, number> => ({
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
});

/**
 * Walk `supersededById` forward from a settlement to the latest attempt.
 * Tolerates a missing target (stops at the last known row) and cycles
 * (stops when a row repeats).
 */
export function resolveChainFrom(
  start: BatchSettlement,
  byId: Map<string, BatchSettlement>,
): BatchSettlement[] {
  const chain: BatchSettlement[] = [start];
  const seen = new Set([start.id]);
  let cur = start;
  while (cur.supersededById) {
    const next = byId.get(cur.supersededById);
    if (!next || seen.has(next.id)) break;
    chain.push(next);
    seen.add(next.id);
    cur = next;
  }
  return chain;
}

/** Ids that some other member supersedes into, i.e. rows that are retries. */
function retryTargets(members: BatchSettlement[], byId: Map<string, BatchSettlement>) {
  const targets = new Set<string>();
  for (const m of members) {
    if (m.supersededById && byId.has(m.supersededById) && m.supersededById !== m.id) {
      targets.add(m.supersededById);
    }
  }
  return targets;
}

/**
 * One chain per original settlement (a row nothing else supersedes into),
 * original first, latest last. Rows only reachable through a cycle are
 * emitted as their own chain so nothing silently disappears.
 */
export function buildChains(members: BatchSettlement[]): BatchSettlement[][] {
  const byId = new Map(members.map((m) => [m.id, m]));
  const targets = retryTargets(members, byId);
  const chains: BatchSettlement[][] = [];
  const covered = new Set<string>();
  const ordered = [...members].sort(byInitiated);

  for (const m of ordered) {
    if (targets.has(m.id)) continue;
    const chain = resolveChainFrom(m, byId);
    chain.forEach((c) => covered.add(c.id));
    chains.push(chain);
  }
  for (const m of ordered) {
    if (covered.has(m.id)) continue;
    const chain = resolveChainFrom(m, byId);
    chain.forEach((c) => covered.add(c.id));
    chains.push(chain);
  }
  return chains;
}

function byInitiated(a: BatchSettlement, b: BatchSettlement) {
  if (a.initiatedAt !== b.initiatedAt) return a.initiatedAt < b.initiatedAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Batch status from real data only: member statuses of each chain's latest
 * attempt and the batch's `processedAt`. No timers, no elapsed-time guesses.
 */
export function deriveBatchStatus(
  batch: Pick<SettlementBatch, "processedAt">,
  heads: Pick<BatchSettlement, "status">[],
): BatchStatus {
  if (heads.length === 0) return batch.processedAt ? "completed" : "created";
  const open = heads.some((h) => h.status === "pending" || h.status === "processing");
  if (open) {
    return heads.every((h) => h.status === "pending") && !batch.processedAt ? "created" : "processing";
  }
  // Everything terminal, but the batch has not been finalised by the job yet.
  if (!batch.processedAt) return "processing";
  const failed = heads.filter((h) => h.status === "failed").length;
  if (failed === 0) return "completed";
  return failed === heads.length ? "failed" : "completed_with_failures";
}

export function summarizeBatch(batch: SettlementBatch, members: BatchSettlement[]): BatchSummary {
  const chains = buildChains(members);
  const heads = chains.map((c) => c[c.length - 1]);
  const counts = emptyCounts();
  for (const h of heads) counts[h.status] += 1;
  return {
    ...batch,
    status: deriveBatchStatus(batch, heads),
    counts,
    memberCount: members.length,
  };
}

export function buildTimeline(batch: SettlementBatch, members: BatchSettlement[]): TimelineEvent[] {
  const events: TimelineEvent[] = [{ key: "created", label: "Batch created", at: batch.createdAt }];
  if (members.length) {
    const initiated = members.map((m) => m.initiatedAt).sort();
    events.push({ key: "first-initiated", label: "First settlement initiated", at: initiated[0] });
    if (initiated[initiated.length - 1] !== initiated[0]) {
      events.push({ key: "last-initiated", label: "Last settlement initiated", at: initiated[initiated.length - 1] });
    }
    const completed = members.map((m) => m.completedAt).filter((v): v is string => !!v).sort();
    if (completed.length) {
      events.push({ key: "first-completed", label: "First settlement completed", at: completed[0] });
      if (completed[completed.length - 1] !== completed[0]) {
        events.push({ key: "last-completed", label: "Last settlement completed", at: completed[completed.length - 1] });
      }
    }
  }
  if (batch.processedAt) events.push({ key: "processed", label: "Batch processed", at: batch.processedAt });
  return events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

export function detailBatch(batch: SettlementBatch, members: BatchSettlement[]): BatchDetail {
  const chains = buildChains(members);
  const chainOf = new Map<string, string[]>();
  for (const chain of chains) {
    const ids = chain.map((c) => c.id);
    for (const c of chain) chainOf.set(c.id, ids);
  }
  const detail: MemberDetail[] = [...members].sort(byInitiated).map((m) => ({
    ...m,
    superseded: !!m.supersededById && members.some((o) => o.id === m.supersededById),
    chain: chainOf.get(m.id) ?? [m.id],
  }));
  return {
    ...summarizeBatch(batch, members),
    timeline: buildTimeline(batch, members),
    members: detail,
    chains,
  };
}

/** Money helpers: decimal strings only, never parseFloat. */
export function formatMoney(value: string, maxFraction = 2): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) return value;
  const [, sign, int, frac = ""] = m;
  const grouped = BigInt(int).toLocaleString("en-US");
  let f = frac.slice(0, maxFraction).replace(/0+$/, "");
  if (f.length < Math.min(2, maxFraction)) f = f.padEnd(Math.min(2, maxFraction), "0");
  return `${sign}${grouped}${f ? `.${f}` : ""}`;
}
