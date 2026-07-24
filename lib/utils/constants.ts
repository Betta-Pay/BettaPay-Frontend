export const SUPPORTED_CURRENCIES = ['USDC', 'XLM', 'USDT'] as const;

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
export const HORIZON_URL = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

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
    contractAddress: process.env.NEXT_PUBLIC_USDT_CONTRACT_ID,
  },
};

export const MOCK_RATES: Record<string, number> = {
  USDC: 1.0,
  XLM: 0.12,
  USDT: 0.999,
};
