import { auditLog as kybAuditLog } from "@/lib/api/fixtures/kybStore";
import type {
  AuditEntry,
  AuditFilters,
  AuditPage,
  NewAuditEntry,
} from "./types";

/**
 * In-memory audit store, kept on `globalThis` so it survives HMR and is shared
 * by every route handler. KYB reviews are written by the KYB route into its
 * own fixture list; `readAll` folds those in so the explorer shows them as
 * `KYB_REVIEW` entries with a before/after status diff.
 */
const g = globalThis as unknown as { __bpAudit?: AuditEntry[]; __bpAuditSeq?: number };

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function seed(): AuditEntry[] {
  return [
    {
      id: "aud_seed_01",
      action: "SETTINGS_UPDATE",
      entityType: "PLATFORM_SETTINGS",
      entityId: "fees",
      actorId: "admin",
      actorType: "admin",
      ipAddress: "102.89.34.17",
      createdAt: minutesAgo(190),
      changes: {
        before: { defaultBps: 100, capUsdc: 250 },
        after: { defaultBps: 120, capUsdc: 250 },
      },
    },
    {
      id: "aud_seed_02",
      action: "ANCHOR_DISABLED",
      entityType: "ANCHOR",
      entityId: "anc_06",
      actorId: "admin",
      actorType: "admin",
      ipAddress: "102.89.34.17",
      createdAt: minutesAgo(1500),
      changes: { before: { enabled: true }, after: { enabled: false } },
    },
    {
      id: "aud_seed_03",
      action: "SETTLEMENT_RETRIED",
      entityType: "SETTLEMENT",
      entityId: "stl_8e6b",
      actorId: "admin",
      actorType: "admin",
      ipAddress: "41.58.2.9",
      createdAt: minutesAgo(2900),
      changes: { before: { status: "failed" }, after: { status: "processing", supersededById: "stl_9f7c" } },
    },
  ];
}

function store(): AuditEntry[] {
  if (!g.__bpAudit) g.__bpAudit = seed();
  return g.__bpAudit;
}

/** Append an entry and return it. Ids are monotonic so ordering is stable. */
export function appendAudit(input: NewAuditEntry): AuditEntry {
  g.__bpAuditSeq = (g.__bpAuditSeq ?? 0) + 1;
  const entry: AuditEntry = {
    ...input,
    id: input.id ?? `aud_${Date.now().toString(36)}_${g.__bpAuditSeq.toString().padStart(5, "0")}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  store().push(entry);
  return entry;
}

function fromKyb(): AuditEntry[] {
  return kybAuditLog.map((e) => ({
    id: e.id,
    action: "KYB_REVIEW",
    entityType: e.entityType,
    entityId: e.entityId,
    actorId: e.reviewerId,
    actorType: "admin",
    ipAddress: null,
    createdAt: e.createdAt,
    changes: {
      before: { kybStatus: "pending" },
      after: { kybStatus: e.decision, note: e.note, reviewer: e.reviewerEmail },
    },
  }));
}

function readAll(): AuditEntry[] {
  return [...store(), ...fromKyb()];
}

/** Newest first; ties on timestamp break by id so pages never overlap. */
function compareDesc(a: AuditEntry, b: AuditEntry): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function encodeCursor(e: Pick<AuditEntry, "createdAt" | "id">): string {
  return Buffer.from(JSON.stringify([e.createdAt, e.id])).toString("base64url");
}

export function decodeCursor(cursor: string): [string, string] | null {
  try {
    const v = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    return Array.isArray(v) && typeof v[0] === "string" && typeof v[1] === "string" ? [v[0], v[1]] : null;
  } catch {
    return null;
  }
}

export function matchesFilters(e: AuditEntry, f: AuditFilters): boolean {
  if (f.entityType && e.entityType !== f.entityType) return false;
  if (f.entityId && e.entityId !== f.entityId) return false;
  if (f.action) {
    if (f.action.endsWith("*")) {
      if (!e.action.startsWith(f.action.slice(0, -1))) return false;
    } else if (e.action !== f.action) return false;
  }
  if (f.actor && !(e.actorId ?? "").toLowerCase().includes(f.actor.toLowerCase())) return false;
  if (f.ip && !(e.ipAddress ?? "").includes(f.ip)) return false;
  if (f.from && e.createdAt < f.from) return false;
  if (f.to && e.createdAt > f.to) return false;
  if (f.q) {
    const hay = [e.action, e.entityType, e.entityId, e.actorId, e.ipAddress, JSON.stringify(e.changes)]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

export function listAllMatching(filters: AuditFilters): AuditEntry[] {
  return readAll().filter((e) => matchesFilters(e, filters)).sort(compareDesc);
}

/**
 * Cursor pagination over (createdAt desc, id desc). The cursor names the last
 * row returned, so rows appended mid-browse never shift or repeat a page.
 */
export function queryAudit(filters: AuditFilters, opts: { cursor?: string | null; limit?: number } = {}): AuditPage {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 200);
  const all = listAllMatching(filters);
  let start = 0;
  const cur = opts.cursor ? decodeCursor(opts.cursor) : null;
  if (cur) {
    const [ts, id] = cur;
    start = all.findIndex((e) => e.createdAt < ts || (e.createdAt === ts && e.id < id));
    if (start === -1) start = all.length;
  }
  const data = all.slice(start, start + limit);
  const last = data[data.length - 1];
  return {
    data,
    total: all.length,
    nextCursor: last && start + limit < all.length ? encodeCursor(last) : null,
  };
}

/** Test helper. */
export function resetAuditStore(): void {
  g.__bpAudit = seed();
  g.__bpAuditSeq = 0;
}
