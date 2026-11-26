import type { ApiSettlement, SettlementEffectiveRule } from '@/lib/api/hooks';

export interface FeeSnapshot {
  bps: number; // base fee in bps, e.g. 100 bps = 1.00%
  baseFeeUsdc: number; // gross * (bps / 10000)
  discountBps?: number; // discount in bps (e.g. 20 bps)
  discountTier?: string; // name/label of discount tier (e.g. "Volume Tier 2 (-20 bps)")
  discountAppliedUsdc: number; // discount amount in USDC
  capAmountUsdc?: number; // max fee cap in USDC
  capApplied: boolean; // whether cap was reached
  effectiveFeeBps: number; // bps after discount
  totalFeeUsdc: number; // final net fee deducted
  feeVersion?: string; // snapshot version, e.g. "v1.2.0"
  ruleSource?: 'merchant' | 'default' | 'governance';
}

export interface CalculateFeeSnapshotOptions {
  feeBps?: number;
  discountBps?: number;
  discountTier?: string;
  capAmountUsdc?: number;
  feeVersion?: string;
  ruleSource?: 'merchant' | 'default' | 'governance';
}

/** Non-finite or negative values fall back to `fallback` (issue #1161). */
function sanitizeNonNegative(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Like `sanitizeNonNegative`, but keeps `undefined` meaning "no cap". */
function sanitizeOptionalNonNegative(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function calculateFeeSnapshot(
  grossAmountUsdc: number,
  options?: CalculateFeeSnapshotOptions,
): FeeSnapshot {
  // Guard against negative / NaN / non-finite inputs so the UI never renders
  // negative or `NaN` fee figures (issue #1161).
  const gross = sanitizeNonNegative(grossAmountUsdc, 0);
  const bps = sanitizeNonNegative(options?.feeBps, 100);
  const baseFeeUsdc = (gross * bps) / 10000;

  const discountBps = Math.min(sanitizeNonNegative(options?.discountBps, 0), bps);
  const discountAppliedUsdc = (gross * discountBps) / 10000;

  const effectiveFeeBps = bps - discountBps;
  let totalFeeUsdc = Math.max(0, baseFeeUsdc - discountAppliedUsdc);

  const capAmountUsdc = sanitizeOptionalNonNegative(options?.capAmountUsdc);
  let capApplied = false;
  if (capAmountUsdc !== undefined && totalFeeUsdc > capAmountUsdc) {
    totalFeeUsdc = capAmountUsdc;
    capApplied = true;
  }

  return {
    bps,
    baseFeeUsdc,
    discountBps,
    discountTier: options?.discountTier,
    discountAppliedUsdc,
    capAmountUsdc,
    capApplied,
    effectiveFeeBps,
    totalFeeUsdc,
    feeVersion: options?.feeVersion ?? 'v1.0.0',
    ruleSource: options?.ruleSource ?? 'governance',
  };
}

/**
 * Effective rule fallbacks ordered by precedence:
 * merchant → default → governance
 *
 * The API is expected to return `effectiveRule` already resolved, but we keep
 * a defensive resolver so the UI degrades gracefully when the field is missing
 * (e.g. older mock fixtures or partial responses).
 */
export const DEFAULT_EFFECTIVE_RULE: SettlementEffectiveRule = {
  feeBps: 100,
  autoSettle: false,
  delay: 60,
  source: 'governance',
};

export function getEffectiveRule(settlement: ApiSettlement): SettlementEffectiveRule {
  if (settlement.effectiveRule) return settlement.effectiveRule;
  return DEFAULT_EFFECTIVE_RULE;
}

export function formatFeeBps(feeBps: number): string {
  // 100 bps = 1%
  const pct = feeBps / 100;
  return `${pct}% (${feeBps} bps)`;
}

export function formatDelay(delayMinutes: number): string {
  // Negative / NaN / non-finite delays degrade to "0m" instead of "-1m" or
  // "NaNh NaNm" (issue #1161).
  const total = Number.isFinite(delayMinutes) && delayMinutes > 0 ? delayMinutes : 0;
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatAutoSettle(autoSettle: boolean): string {
  return autoSettle ? 'on' : 'off';
}
