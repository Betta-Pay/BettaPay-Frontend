import { ROUTES } from '@/lib/navigation/routes';

export type TierId = 'starter' | 'growth' | 'enterprise';

export interface PricingTier {
  id: TierId;
  name: string;
  tagline: string;
  /** Minimum monthly volume in USD for this tier. */
  minVolumeUsd: number;
  /** Maximum monthly volume in USD for this tier. */
  maxVolumeUsd: number;
  /** Percentage fee on volume, e.g. 1.5 means 1.5%. Null for custom pricing. */
  percentFee: number | null;
  /** Fixed fee per transaction in USD. Null for custom pricing. */
  fixedFee: number | null;
  /** Human-readable fee label, e.g. "1.5% + $0.10". */
  transactionFee: string;
  monthlyMinimum: string;
  /** Monthly volume in USD exempt from the percentage fee. */
  volumeIncludedUsd: number;
  volumeIncluded: string;
  /** Settlement speed label, used both in TierCard and ComparisonTable. */
  settlementSpeed: string;
  /** Support tier label. */
  supportLevel: string;
  /** API rate limit label (requests per minute), e.g. "60 req/min". */
  apiRateLimit: string;
  /** Whether webhooks are available on this plan. */
  webhooks: boolean;
  /** Whether custom branding is available on this plan. */
  customBranding: boolean;
  /** Whether multi-user team access is available on this plan. */
  multiUserAccess: boolean;
  /** Whether audit logs are available on this plan. */
  auditLogs: boolean;
  /** Whether a contractual uptime SLA is included. */
  uptimeSla: boolean;
  /** Whether a dedicated account manager is assigned. */
  dedicatedAccountManager: boolean;
  features: string[];
  cta: { label: string; href: string };
  highlighted: boolean;
}

/**
 * FEATURE_CAPABILITY_MAP
 *
 * Maps every human-readable feature string that appears in a tier's
 * `features` array to a capability slug that corresponds to an
 * implemented API endpoint or documented product behaviour.
 *
 * The test suite asserts that every string in every tier's `features`
 * array has an entry here, preventing marketing copy from drifting away
 * from what the product actually delivers.
 *
 * Capability slugs:
 *   "fee-schedule"         – per-transaction fees described in /docs/fees
 *   "no-monthly-minimum"   – Starter plan has no floor, verified by billing logic
 *   "volume-included"      – Growth plan's $10k included allowance in estimateMonthlyCost
 *   "settlement-standard"  – T+1 bank settlement for Starter (SEP-24 anchor)
 *   "settlement-priority"  – same-day settlement for Growth
 *   "settlement-instant"   – instant settlement for Enterprise
 *   "support-email"        – email support channel
 *   "support-priority"     – priority queue support channel
 *   "support-dedicated"    – dedicated account manager
 *   "payment-links"        – /api/payment-links endpoint
 *   "analytics-basic"      – basic dashboard analytics
 *   "analytics-advanced"   – advanced analytics + CSV export
 *   "webhooks"             – /api/webhooks endpoint
 *   "api-access"           – REST API with documented rate limits
 *   "uptime-sla"           – contractual SLA in Enterprise agreements
 *   "custom-contracts"     – enterprise invoicing and contract docs
 *   "multi-user"           – team member management endpoints
 *   "audit-logs"           – /api/admin/audit endpoint
 *   "volume-discounts"     – custom rate negotiation for Enterprise
 */
export const FEATURE_CAPABILITY_MAP: Record<string, string> = {
  // Starter
  '1.5% + $0.10 per transaction': 'fee-schedule',
  'No monthly minimum': 'no-monthly-minimum',
  'Standard settlement (T+1)': 'settlement-standard',
  'Email support': 'support-email',
  'Payment links & QR codes': 'payment-links',
  'Basic dashboard analytics': 'analytics-basic',
  // Growth
  '1.0% + $0.05 per transaction': 'fee-schedule',
  'First $10k monthly volume included': 'volume-included',
  'Priority settlement (same day)': 'settlement-priority',
  'Priority support': 'support-priority',
  'Webhooks & API access': 'webhooks',
  'Advanced analytics & exports': 'analytics-advanced',
  // Enterprise
  'Custom volume discounts': 'volume-discounts',
  'Instant settlement': 'settlement-instant',
  'Dedicated account manager': 'support-dedicated',
  'Uptime SLA': 'uptime-sla',
  'Custom contracts & invoicing': 'custom-contracts',
  'Multi-user access & audit logs': 'multi-user',
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Pay as you go for small merchants',
    minVolumeUsd: 0,
    maxVolumeUsd: 10_000,
    percentFee: 1.5,
    fixedFee: 0.1,
    transactionFee: '1.5% + $0.10',
    monthlyMinimum: 'No monthly minimum',
    volumeIncludedUsd: 0,
    volumeIncluded: 'Pay per transaction',
    settlementSpeed: 'Standard (T+1)',
    supportLevel: 'Email',
    apiRateLimit: '60 req/min',
    webhooks: false,
    customBranding: false,
    multiUserAccess: false,
    auditLogs: false,
    uptimeSla: false,
    dedicatedAccountManager: false,
    features: [
      '1.5% + $0.10 per transaction',
      'No monthly minimum',
      'Standard settlement (T+1)',
      'Email support',
      'Payment links & QR codes',
      'Basic dashboard analytics',
    ],
    cta: { label: 'Get Started', href: ROUTES.REGISTER },
    highlighted: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Volume discounts for established businesses',
    minVolumeUsd: 10_000,
    maxVolumeUsd: 500_000,
    percentFee: 1.0,
    fixedFee: 0.05,
    transactionFee: '1.0% + $0.05',
    monthlyMinimum: '$10k/mo volume included',
    volumeIncludedUsd: 10_000,
    volumeIncluded: '$10,000 / month',
    settlementSpeed: 'Priority (same day)',
    supportLevel: 'Priority',
    apiRateLimit: '300 req/min',
    webhooks: true,
    customBranding: true,
    multiUserAccess: false,
    auditLogs: false,
    uptimeSla: false,
    dedicatedAccountManager: false,
    features: [
      '1.0% + $0.05 per transaction',
      'First $10k monthly volume included',
      'Priority settlement (same day)',
      'Priority support',
      'Webhooks & API access',
      'Advanced analytics & exports',
    ],
    cta: { label: 'Get Started', href: ROUTES.REGISTER },
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom pricing for high-volume platforms',
    minVolumeUsd: 500_000,
    maxVolumeUsd: 10_000_000,
    percentFee: null,
    fixedFee: null,
    transactionFee: 'Custom',
    monthlyMinimum: 'Custom contract',
    volumeIncludedUsd: 0,
    volumeIncluded: 'Unlimited',
    settlementSpeed: 'Instant',
    supportLevel: 'Dedicated',
    apiRateLimit: 'Custom',
    webhooks: true,
    customBranding: true,
    multiUserAccess: true,
    auditLogs: true,
    uptimeSla: true,
    dedicatedAccountManager: true,
    features: [
      'Custom volume discounts',
      'Instant settlement',
      'Dedicated account manager',
      'Uptime SLA',
      'Custom contracts & invoicing',
      'Multi-user access & audit logs',
    ],
    cta: { label: 'Contact Sales', href: '/contact?subject=enterprise-pricing' },
    highlighted: false,
  },
];

// ─── Comparison table rows ─────────────────────────────────────────────────────
//
// Derived from PRICING_TIERS so the table never drifts from the tier data.
// Each row describes one capability; cell values are pulled from the
// structured fields on each tier rather than duplicated strings.

type CellValue = string | boolean;

/** Comparison table rows derived from PRICING_TIERS — single source of truth. */
export interface ComparisonRow extends Record<TierId, CellValue> {
  feature: string;
}

function tierCell(tier: PricingTier, feature: string): CellValue {
  switch (feature) {
    case 'Transaction fee':           return tier.transactionFee;
    case 'Monthly volume included':   return tier.id === 'starter' ? 'Pay per transaction'
                                           : tier.id === 'growth'  ? '$10,000'
                                           :                         'Unlimited';
    case 'Settlement speed':          return tier.settlementSpeed;
    case 'Support level':             return tier.supportLevel;
    case 'Webhooks':                  return tier.webhooks;
    case 'API rate limits':           return tier.apiRateLimit;
    case 'Custom branding':           return tier.customBranding;
    case 'Multi-user access':         return tier.multiUserAccess;
    case 'Audit logs':                return tier.auditLogs;
    case 'Uptime SLA':                return tier.uptimeSla;
    case 'Dedicated account manager': return tier.dedicatedAccountManager;
    default:                          return false;
  }
}

const COMPARISON_FEATURE_LABELS = [
  'Transaction fee',
  'Monthly volume included',
  'Settlement speed',
  'Support level',
  'Webhooks',
  'API rate limits',
  'Custom branding',
  'Multi-user access',
  'Audit logs',
  'Uptime SLA',
  'Dedicated account manager',
] as const;

/** Comparison table rows derived from PRICING_TIERS — single source of truth. */
export const COMPARISON_ROWS: ComparisonRow[] = COMPARISON_FEATURE_LABELS.map((label) => {
  const cells = PRICING_TIERS.map((t) => tierCell(t, label));
  return {
    feature: label,
    starter: cells[0] ?? false,
    growth: cells[1] ?? false,
    enterprise: cells[2] ?? false,
  };
});

// ─── Volume calculator ────────────────────────────────────────────────────────

export const MIN_VOLUME = 1_000;
export const MAX_VOLUME = 10_000_000;
export const DEFAULT_VOLUME = 50_000;
export const DEFAULT_AVG_TRANSACTION = 50;

/**
 * Estimated monthly cost for a tier:
 * (billable volume × percent fee) + (transaction count × fixed fee).
 * Volume covered by the tier's included allowance is exempt from the
 * percentage fee. Returns null for custom-priced tiers.
 */
export function estimateMonthlyCost(
  tier: PricingTier,
  monthlyVolumeUsd: number,
  avgTransactionUsd: number = DEFAULT_AVG_TRANSACTION
): number | null {
  if (tier.percentFee == null || tier.fixedFee == null) return null;
  if (monthlyVolumeUsd <= 0 || avgTransactionUsd <= 0) return 0;
  const billableVolume = Math.max(0, monthlyVolumeUsd - tier.volumeIncludedUsd);
  const transactions = monthlyVolumeUsd / avgTransactionUsd;
  return billableVolume * (tier.percentFee / 100) + transactions * tier.fixedFee;
}

/** Starter under Starter max, Growth up to Growth max, Enterprise above. Derived from PRICING_TIERS. */
export function recommendTier(monthlyVolumeUsd: number): TierId {
  const starter = PRICING_TIERS.find((t) => t.id === 'starter');
  const growth = PRICING_TIERS.find((t) => t.id === 'growth');

  if (starter && monthlyVolumeUsd < starter.maxVolumeUsd) {
    return 'starter';
  }
  if (growth && monthlyVolumeUsd <= growth.maxVolumeUsd) {
    return 'growth';
  }
  return 'enterprise';
}

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return DEFAULT_VOLUME;
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, Math.round(volume)));
}

/** Map a 0–100 slider position onto the $1k–$10M range on a log scale. */
export function sliderToVolume(position: number): number {
  const t = Math.min(100, Math.max(0, position)) / 100;
  const raw = Math.pow(10, Math.log10(MIN_VOLUME) + t * (Math.log10(MAX_VOLUME) - Math.log10(MIN_VOLUME)));
  // Snap to sensible steps so the readout stays clean
  const step = raw < 10_000 ? 500 : raw < 100_000 ? 1_000 : raw < 1_000_000 ? 10_000 : 100_000;
  return clampVolume(Math.round(raw / step) * step);
}

/** Inverse of sliderToVolume: volume → 0–100 slider position. */
export function volumeToSlider(volume: number): number {
  const v = clampVolume(volume);
  return ((Math.log10(v) - Math.log10(MIN_VOLUME)) / (Math.log10(MAX_VOLUME) - Math.log10(MIN_VOLUME))) * 100;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount < 100 ? 2 : 0,
  }).format(amount);
}

export function formatUsdCompact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}
