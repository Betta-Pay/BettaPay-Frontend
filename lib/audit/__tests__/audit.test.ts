import { diffJson } from "../diff";
import { auditToCsv } from "../csv";
import { entityHref } from "../links";
import { apiQueryString, readFilters, writeFilters } from "../query";
import { appendAudit, queryAudit, resetAuditStore, decodeCursor } from "../store";
import { auditLog as kybAuditLog } from "@/lib/api/fixtures/kybStore";

beforeEach(() => {
  resetAuditStore();
  kybAuditLog.length = 0;
});

describe("diffJson", () => {
  it("reports added, removed and modified leaves with dotted paths", () => {
    const rows = diffJson(
      { fees: { defaultBps: 100, capUsdc: 250 }, flags: ["a", "b"], gone: 1 },
      { fees: { defaultBps: 150, capUsdc: 250 }, flags: ["a", "b", "c"], extra: true },
    );
    expect(rows).toEqual([
      { path: "extra", kind: "added", after: true },
      { path: "fees.defaultBps", kind: "modified", before: 100, after: 150 },
      { path: "flags[2]", kind: "added", after: "c" },
      { path: "gone", kind: "removed", before: 1 },
    ]);
  });

  it("treats identical values as no change and null sides as add/remove", () => {
    expect(diffJson({ a: 1 }, { a: 1 })).toEqual([]);
    expect(diffJson(null, { a: 1 })).toEqual([{ path: "a", kind: "added", after: 1 }]);
    expect(diffJson({ a: 1 }, null)).toEqual([{ path: "a", kind: "removed", before: 1 }]);
  });
});

describe("queryAudit", () => {
  it("filters by entity type, wildcard action, actor, ip, range and free text", () => {
    appendAudit({ action: "SETTINGS_UPDATE", entityType: "PLATFORM_SETTINGS", entityId: "fees", actorId: "root", actorType: "admin", ipAddress: "10.1.1.1", changes: { before: { x: 1 }, after: { x: 2 } } });
    expect(queryAudit({ action: "SETTINGS_*" }).data.every((e) => e.action.startsWith("SETTINGS_"))).toBe(true);
    expect(queryAudit({ entityType: "ANCHOR" }).data.map((e) => e.entityId)).toEqual(["anc_06"]);
    expect(queryAudit({ actor: "ROOT" }).total).toBe(1);
    expect(queryAudit({ ip: "10.1" }).total).toBe(1);
    expect(queryAudit({ q: "\"x\":2" }).total).toBe(1);
    expect(queryAudit({ from: "2999-01-01T00:00:00.000Z" }).total).toBe(0);
  });

  it("folds KYB reviews in as KYB_REVIEW with a status diff", () => {
    kybAuditLog.push({ id: "kyb_1", entityType: "MERCHANT", entityId: "merch-1", action: "KYB_APPROVED", reviewerId: "r1", reviewerEmail: "r@x.io", decision: "approved", note: "ok", createdAt: new Date().toISOString() });
    const [row] = queryAudit({ action: "KYB_REVIEW" }).data;
    expect(row.entityId).toBe("merch-1");
    expect(diffJson(row.changes!.before, row.changes!.after).map((d) => d.path)).toContain("kybStatus");
  });

  it("cursor pages are stable: no overlap, no gaps, and new rows do not shift old pages", () => {
    const stamp = "2026-10-01T00:00:00.000Z";
    for (let i = 0; i < 7; i++) appendAudit({ id: `row_${i}`, createdAt: stamp, action: "T", entityType: "T", entityId: `e${i}`, actorId: null, actorType: null, ipAddress: null, changes: null });
    const first = queryAudit({ action: "T" }, { limit: 3 });
    // A newer row arrives between page loads.
    appendAudit({ id: "row_new", createdAt: "2026-11-01T00:00:00.000Z", action: "T", entityType: "T", entityId: "new", actorId: null, actorType: null, ipAddress: null, changes: null });
    const second = queryAudit({ action: "T" }, { limit: 3, cursor: first.nextCursor });
    const third = queryAudit({ action: "T" }, { limit: 3, cursor: second.nextCursor });
    const ids = [...first.data, ...second.data, ...third.data].map((e) => e.id);
    expect(ids).toEqual(["row_6", "row_5", "row_4", "row_3", "row_2", "row_1", "row_0"]);
    expect(third.nextCursor).toBeNull();
  });

  it("returns an empty page for a cursor past the end", () => {
    const cursor = Buffer.from(JSON.stringify(["1970-01-01T00:00:00.000Z", "a"])).toString("base64url");
    expect(queryAudit({}, { cursor }).data).toEqual([]);
    expect(decodeCursor("not-a-cursor")).toBeNull();
  });
});

describe("url filters", () => {
  it("round-trips through the query string with stable ordering", () => {
    const qs = writeFilters({ to: "2026-10-02", action: "SETTINGS_UPDATE", q: "fee bps" });
    expect(qs).toBe("q=fee+bps&action=SETTINGS_UPDATE&to=2026-10-02");
    expect(readFilters(new URLSearchParams(qs))).toEqual({ q: "fee bps", action: "SETTINGS_UPDATE", to: "2026-10-02" });
  });

  it("turns date inputs into inclusive UTC bounds for the API", () => {
    const qs = new URLSearchParams(apiQueryString({ from: "2026-10-01", to: "2026-10-02" }, { limit: 25 }));
    expect(qs.get("from")).toBe("2026-10-01T00:00:00.000Z");
    expect(qs.get("to")).toBe("2026-10-02T23:59:59.999Z");
    expect(qs.get("limit")).toBe("25");
  });
});

describe("csv + links", () => {
  it("exports before/after JSON and neutralises formula injection", () => {
    const e = appendAudit({ action: "=HYPERLINK(1)", entityType: "T", entityId: "a,b", actorId: null, actorType: null, ipAddress: null, changes: { before: { a: 1 }, after: { a: 2 } } });
    const csv = auditToCsv([e]);
    expect(csv.startsWith("﻿id,createdAt,action")).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(1)"`);
    expect(csv).toContain(`"a,b"`);
    expect(csv).toContain(`"{""a"":2}"`);
  });

  it("links only entities that have a page", () => {
    expect(entityHref("MERCHANT", "m 1")).toBe("/merchants/kyb?merchant=m%201");
    expect(entityHref("ANCHOR", "anc_1")).toBe("/anchors?anchor=anc_1");
    expect(entityHref("SETTLEMENT", "s1")).toBeNull();
  });
});
