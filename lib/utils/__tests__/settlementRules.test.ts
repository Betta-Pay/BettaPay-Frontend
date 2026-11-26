/**
 * lib/utils/__tests__/settlementRules.test.ts
 *
 * Issue #1161 — negative / NaN / non-finite inputs must not leak into fee
 * snapshots or delay labels.
 */

import { calculateFeeSnapshot, formatDelay } from "../settlementRules";

describe("calculateFeeSnapshot input sanitisation (#1161)", () => {
  it("zeroes the snapshot for a negative gross amount", () => {
    const snap = calculateFeeSnapshot(-100);

    expect(snap.baseFeeUsdc).toBe(0);
    expect(snap.discountAppliedUsdc).toBe(0);
    expect(snap.totalFeeUsdc).toBe(0);
    expect(snap.effectiveFeeBps).toBeGreaterThanOrEqual(0);
  });

  it("zeroes the snapshot for NaN gross / feeBps / discountBps", () => {
    const snap = calculateFeeSnapshot(NaN, { feeBps: NaN, discountBps: NaN });

    expect(snap.bps).toBe(100); // falls back to the default
    expect(snap.discountBps).toBe(0);
    expect(snap.baseFeeUsdc).toBe(0);
    expect(snap.totalFeeUsdc).toBe(0);

    const everyFieldFiniteNonNegative = [
      snap.bps,
      snap.baseFeeUsdc,
      snap.discountBps,
      snap.discountAppliedUsdc,
      snap.effectiveFeeBps,
      snap.totalFeeUsdc,
    ].every((n) => Number.isFinite(n) && n >= 0);
    expect(everyFieldFiniteNonNegative).toBe(true);
  });

  it("ignores a negative or NaN cap instead of producing a negative fee", () => {
    const negativeCap = calculateFeeSnapshot(1000, { capAmountUsdc: -5 });
    expect(negativeCap.capApplied).toBe(false);
    expect(negativeCap.totalFeeUsdc).toBeCloseTo(10);

    const nanCap = calculateFeeSnapshot(1000, { capAmountUsdc: NaN });
    expect(nanCap.capApplied).toBe(false);
    expect(nanCap.totalFeeUsdc).toBeCloseTo(10);
  });

  it("still computes expected fees for valid inputs", () => {
    const snap = calculateFeeSnapshot(1000, { feeBps: 100, discountBps: 20 });

    expect(snap.baseFeeUsdc).toBeCloseTo(10);
    expect(snap.discountAppliedUsdc).toBeCloseTo(2);
    expect(snap.totalFeeUsdc).toBeCloseTo(8);
    expect(snap.effectiveFeeBps).toBe(80);
  });
});

describe("formatDelay (#1161)", () => {
  it("degrades zero / negative / NaN inputs to 0m", () => {
    expect(formatDelay(0)).toBe("0m");
    expect(formatDelay(-5)).toBe("0m");
    expect(formatDelay(NaN)).toBe("0m");
    expect(formatDelay(Infinity)).toBe("0m");
  });

  it("keeps the hours/minutes formatting for valid values", () => {
    expect(formatDelay(45)).toBe("45m");
    expect(formatDelay(60)).toBe("1h");
    expect(formatDelay(90)).toBe("1h 30m");
  });
});
