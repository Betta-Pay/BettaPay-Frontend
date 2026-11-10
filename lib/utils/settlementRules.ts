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

export function calculateFeeSnapshot(
  grossAmountUsdc: number,
  options?: CalculateFeeSnapshotOptions,
): FeeSnapshot {
  const bps = options?.feeBps ?? 100;
  const baseFeeUsdc = (grossAmountUsdc * bps) / 10000;

  const discountBps = Math.min(options?.discountBps ?? 0, bps);
  const discountAppliedUsdc = (grossAmountUsdc * discountBps) / 10000;

  const effectiveFeeBps = bps - discountBps;
  let totalFeeUsdc = Math.max(0, baseFeeUsdc - discountAppliedUsdc);

  let capApplied = false;
  if (options?.capAmountUsdc !== undefined && totalFeeUsdc > options.capAmountUsdc) {
    totalFeeUsdc = options.capAmountUsdc;
    capApplied = true;
  }

  return {
    bps,
    baseFeeUsdc,
    discountBps,
    discountTier: options?.discountTier,
    discountAppliedUsdc,
    capAmountUsdc: options?.capAmountUsdc,
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
  if (delayMinutes < 60) return `${delayMinutes}m`;
  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatAutoSettle(autoSettle: boolean): string {
  return autoSettle ? 'on' : 'off';
}

export interface AnchorThresholdRules {
  min_amount?: number | string | null;
  max_amount?: number | string | null;
  minAmount?: number | string | null;
  maxAmount?: number | string | null;
}

export type SettlementThresholdViolationReason =
  | 'INVALID_AMOUNT'
  | 'BELOW_MINIMUM'
  | 'ABOVE_MAXIMUM';

export interface SettlementValidationResult {
  isValid: boolean;
  error?: string;
  reason?: SettlementThresholdViolationReason;
  minAmount?: number;
  maxAmount?: number;
}

function toFiniteNonNegativeNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * Validates a deposit or withdrawal amount against Stellar Anchor (SEP-0024 / SEP-0006)
 * `min_amount` and `max_amount` limits.
 */
export function validateSettlementThreshold(
  amount: number | string,
  rules: AnchorThresholdRules = {},
  options?: { assetCode?: string; operation?: 'deposit' | 'withdrawal' },
): SettlementValidationResult {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  const assetLabel = options?.assetCode ? ` ${options.assetCode}` : '';
  const operationLabel = options?.operation ?? 'settlement';

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return {
      isValid: false,
      reason: 'INVALID_AMOUNT',
      error: `Enter a valid ${operationLabel} amount greater than 0${assetLabel}.`,
    };
  }

  const minAmount = toFiniteNonNegativeNumber(rules.min_amount ?? rules.minAmount);
  const maxAmount = toFiniteNonNegativeNumber(rules.max_amount ?? rules.maxAmount);

  if (minAmount !== undefined && numericAmount < minAmount) {
    return {
      isValid: false,
      reason: 'BELOW_MINIMUM',
      minAmount,
      maxAmount,
      error: `Minimum ${operationLabel} amount is ${minAmount}${assetLabel}.`,
    };
  }

  if (maxAmount !== undefined && maxAmount > 0 && numericAmount > maxAmount) {
    return {
      isValid: false,
      reason: 'ABOVE_MAXIMUM',
      minAmount,
      maxAmount,
      error: `Maximum ${operationLabel} amount is ${maxAmount}${assetLabel}.`,
    };
  }

  return {
    isValid: true,
    minAmount,
    maxAmount,
  };
}

/**
 * Formats anchor `min_amount` and `max_amount` thresholds for UI display.
 */
export function formatAnchorLimits(rules: AnchorThresholdRules, assetCode = 'USDC'): string {
  const minAmount = toFiniteNonNegativeNumber(rules.min_amount ?? rules.minAmount);
  const maxAmount = toFiniteNonNegativeNumber(rules.max_amount ?? rules.maxAmount);

  if (minAmount !== undefined && maxAmount !== undefined && maxAmount > 0) {
    return `${minAmount} - ${maxAmount} ${assetCode}`;
  }
  if (minAmount !== undefined) {
    return `Min ${minAmount} ${assetCode}`;
  }
  if (maxAmount !== undefined && maxAmount > 0) {
    return `Max ${maxAmount} ${assetCode}`;
  }
  return 'No anchor limits';
}
