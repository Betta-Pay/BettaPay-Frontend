export type TierId = 'starter' | 'growth' | 'enterprise';

export interface PricingTier {
  id: TierId;
  name: string;
  tagline: string;
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
  features: string[];
  cta: { label: string; href: string };
  highlighted: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Pay as you go for small merchants',
    percentFee: 1.5,
    fixedFee: 0.1,
    transactionFee: '1.5% + $0.10',
    monthlyMinimum: 'No monthly minimum',
    volumeIncludedUsd: 0,
    volumeIncluded: 'Pay per transaction',
    features: [
      '1.5% + $0.10 per transaction',
      'No monthly minimum',
      'Standard settlement (T+1)',
      'Email support',
      'Payment links & QR codes',
      'Basic dashboard analytics',
    ],
    cta: { label: 'Get Started', href: '/auth/register' },
    highlighted: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Volume discounts for established businesses',
    percentFee: 1.0,
    fixedFee: 0.05,
    transactionFee: '1.0% + $0.05',
    monthlyMinimum: '$10k/mo volume included',
    volumeIncludedUsd: 10_000,
    volumeIncluded: '$10,000 / month',
    features: [
      '1.0% + $0.05 per transaction',
      'First $10k monthly volume included',
      'Priority settlement (same day)',
      'Priority support',
      'Webhooks & API access',
      'Advanced analytics & exports',
    ],
    cta: { label: 'Get Started', href: '/auth/register' },
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom pricing for high-volume platforms',
    percentFee: null,
    fixedFee: null,
    transactionFee: 'Custom',
    monthlyMinimum: 'Custom contract',
    volumeIncludedUsd: 0,
    volumeIncluded: 'Unlimited',
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

/** Starter under $10k, Growth up to $500k, Enterprise above. */
export function recommendTier(monthlyVolumeUsd: number): TierId {
  if (monthlyVolumeUsd < 10_000) return 'starter';
  if (monthlyVolumeUsd <= 500_000) return 'growth';
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
