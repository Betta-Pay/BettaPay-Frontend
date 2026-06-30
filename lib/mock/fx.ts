export interface FxPair {
  from: string;
  to: string;
  rate: string;
  change: number;
  trend: 'up' | 'down';
}

export const pairs: FxPair[] = [
  { from: 'USDC', to: 'NGN', rate: '₦1,550', change: +1.6, trend: 'up' },
  { from: 'XLM', to: 'NGN', rate: '₦324.5', change: -0.8, trend: 'down' },
  { from: 'USDC', to: 'XLM', rate: '4.78 XLM', change: +2.3, trend: 'up' },
];
