import { STELLAR_NETWORK, HORIZON_URL, USDT_CONTRACT_ID } from '@/lib/config';

export { STELLAR_NETWORK, HORIZON_URL };

export const SUPPORTED_SETTLEMENT_CURRENCIES = ['NGN', 'USD', 'USDC', 'GHS', 'KES', 'ZAR'] as const;
export type SettlementCurrency = typeof SUPPORTED_SETTLEMENT_CURRENCIES[number];

export const ONBOARDING_COMPLETED_KEY = 'bp_onboarded' as const;


export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
export const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const SUPPORTED_CURRENCIES = ['USDC', 'XLM', 'USDT'] as const;

/**
 * Canonical payment status vocabulary.
 *
 * All parts of the UI and API docs must use these values exclusively.
 *
 * Lifecycle: pending → processing → completed | failed | expired
 *
 * Note: the legacy "success" value that appeared in some mock/test data has
 * been unified under "completed", which is the canonical term used by the
 * backend API and docs.
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

/**
 * Normalise a raw status string from any source (API, mock, legacy) to the
 * canonical PaymentStatus vocabulary. Call this at data-ingestion boundaries
 * (API hooks, mock fixtures) so the rest of the UI only ever sees canonical
 * values.
 */
export function normalizePaymentStatus(raw: string | null | undefined): PaymentStatus {
  if (!raw || typeof raw !== 'string') return PAYMENT_STATUS.PENDING as PaymentStatus;
  const lower = raw.toLowerCase().trim();
  // Map every known alias to the canonical value
  switch (lower) {
    case 'success':       // legacy mock / old backend spelling
      return PAYMENT_STATUS.COMPLETED;
    case 'completed':
      return PAYMENT_STATUS.COMPLETED;
    case 'pending':
      return PAYMENT_STATUS.PENDING;
    case 'processing':
      return PAYMENT_STATUS.PROCESSING;
    case 'failed':
      return PAYMENT_STATUS.FAILED;
    case 'expired':
      return PAYMENT_STATUS.EXPIRED;
    default:
      // Unknown values fall through as-is so StatusBadge can show the
      // raw label rather than silently swallowing unexpected statuses.
      return lower as PaymentStatus;
  }
}

export interface CurrencyConfig {
  code: string;
  name: string;
  icon: string;
  decimals: number;
  stroopMultiplier: number;
  contractAddress?: string;
}

export const MULTI_CURRENCY_ASSETS: Record<string, CurrencyConfig> = {
  USDC: {
    code: 'USDC',
    name: 'USD Coin',
    icon: '$',
    decimals: 7,
    stroopMultiplier: 10_000_000,
  },
  XLM: {
    code: 'XLM',
    name: 'Stellar Lumens',
    icon: '★',
    decimals: 7,
    stroopMultiplier: 10_000_000,
  },
  USDT: {
    code: 'USDT',
    name: 'Tether',
    icon: '₮',
    decimals: 7,
    stroopMultiplier: 10_000_000,
    contractAddress: USDT_CONTRACT_ID,
  },
};

export const MOCK_RATES: Record<string, number> = {
  USDC: 1.0,
  XLM: 0.12,
  USDT: 0.999,
};
