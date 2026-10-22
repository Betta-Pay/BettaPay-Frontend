import { buildChains, deriveBatchStatus, detailBatch, formatMoney, resolveChainFrom } from "../derive";
import type { BatchSettlement, SettlementBatch, SettlementStatus } from "../types";

const t = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString();
function mem(id: string, status: SettlementStatus, over: Partial<BatchSettlement> = {}): BatchSettlement {
  return {
    id, merchantId: "m", totalAmount: "10", grossAmount: "10.0000000", feeAmount: "0.1000000", netAmount: "9.9000000",
    feeBps: 100, asset: "USDC", status, batchId: "b", initiatedAt: t(1), completedAt: null, supersededById: null, ...over,
  };
}
const batch = (processedAt: string | null = null): SettlementBatch => ({
  id: "b", asset: "USDC", totalCount: 1, totalGross: "1", totalFees: "0", totalNet: "1", createdAt: t(0), processedAt,
});

describe("deriveBatchStatus", () => {
  it("created when nothing has started", () =>
    expect(deriveBatchStatus(batch(), [{ status: "pending" }, { status: "pending" }])).toBe("created"));
  it("processing when any member is in flight", () =>
    expect(deriveBatchStatus(batch(), [{ status: "pending" }, { status: "processing" }])).toBe("processing"));
  it("processing when all terminal but the batch is not finalised", () =>
    expect(deriveBatchStatus(batch(), [{ status: "completed" }])).toBe("processing"));
  it("completed when processed and all succeeded", () =>
    expect(deriveBatchStatus(batch(t(9)), [{ status: "completed" }])).toBe("completed"));
  it("completed_with_failures on a mix", () =>
    expect(deriveBatchStatus(batch(t(9)), [{ status: "completed" }, { status: "failed" }])).toBe("completed_with_failures"));
  it("failed when every chain head failed", () =>
    expect(deriveBatchStatus(batch(t(9)), [{ status: "failed" }])).toBe("failed"));
  it("never depends on the clock", () => {
    jest.useFakeTimers().setSystemTime(new Date("2099-01-01"));
    expect(deriveBatchStatus(batch(), [{ status: "pending" }])).toBe("created");
    jest.useRealTimers();
  });
});

describe("retry chains", () => {
  const a = mem("a", "failed", { supersededById: "b" });
  const b = mem("b", "failed", { supersededById: "c", initiatedAt: t(2) });
  const c = mem("c", "completed", { initiatedAt: t(3) });

  it("resolves multi-hop chains original -> latest", () => {
    const [chain] = buildChains([c, b, a]);
    expect(chain.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("tolerates a missing link target", () => {
    const orphan = mem("x", "failed", { supersededById: "gone" });
    expect(resolveChainFrom(orphan, new Map([["x", orphan]])).map((r) => r.id)).toEqual(["x"]);
  });
  it("is cycle-safe and keeps every row", () => {
    const p = mem("p", "failed", { supersededById: "q" });
    const q = mem("q", "failed", { supersededById: "p", initiatedAt: t(2) });
    const chains = buildChains([p, q]);
    expect(chains.flat().map((r) => r.id).sort()).toEqual(["p", "q"]);
  });
  it("flags superseded members and judges status by the chain head", () => {
    const d = detailBatch(batch(t(9)), [a, b, c]);
    expect(d.members.map((m) => [m.id, m.superseded])).toEqual([["a", true], ["b", true], ["c", false]]);
    expect(d.members[0].chain).toEqual(["a", "b", "c"]);
    expect(d.status).toBe("completed");
    expect(d.counts).toEqual({ pending: 0, processing: 0, completed: 1, failed: 0 });
  });
});

describe("timeline and money", () => {
  it("uses real timestamps only, in order", () => {
    const d = detailBatch(batch(t(9)), [mem("a", "completed", { initiatedAt: t(2), completedAt: t(5) })]);
    expect(d.timeline.map((e) => e.key)).toEqual(["created", "first-initiated", "first-completed", "processed"]);
  });
  it("formats large decimals without float loss", () => {
    expect(formatMoney("12345678901234567890.1234567")).toBe("12,345,678,901,234,567,890.12");
    expect(formatMoney("5")).toBe("5.00");
  });
});
