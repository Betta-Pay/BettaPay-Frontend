import { subHours, subDays } from 'date-fns';
import { PAYMENT_STATUS, normalizePaymentStatus, type PaymentStatus } from '../utils/constants';

export interface Transaction {
  id: string;
  txHash: string;
  payerAddress: string;
  merchantAddress: string;
  amountUsdc: number;
  amountNgn: number;
  /**
   * ISO 4217 code the settlement is denominated in. Defaults to `NGN`, which
   * pairs with `amountNgn`; transactions settled in another fiat (e.g. `EUR`)
   * must supply the matching `fiatAmount` so the symbol and the number cannot
   * drift apart.
   */
  fiatCurrency?: string;
  fiatAmount?: number | null;
  fxRate: number;
  status: PaymentStatus;
  source: 'QR Code' | 'Payment Link' | 'API';
  timestamp: string;
  stellarOpId?: string;
}

const now = new Date();

export const mockTransactions: Transaction[] = [
  {
    id: 'tx_01',
    txHash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    payerAddress: 'GBX...4Q3',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 1500.00,
    amountNgn: 2325000,
    fxRate: 1550,
    status: normalizePaymentStatus('success'), // legacy alias → 'completed'
    source: 'Payment Link',
    timestamp: subHours(now, 2).toISOString(),
  },
  {
    id: 'tx_02',
    txHash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    payerAddress: 'GCY...8R2',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 45.50,
    amountNgn: 70525,
    fxRate: 1550,
    status: PAYMENT_STATUS.COMPLETED,
    source: 'QR Code',
    timestamp: subHours(now, 5).toISOString(),
  },
  {
    id: 'tx_03',
    txHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    payerAddress: 'GDZ...1T5',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 12000.00,
    amountNgn: 18600000,
    fxRate: 1550,
    status: PAYMENT_STATUS.PENDING,
    source: 'API',
    timestamp: subHours(now, 12).toISOString(),
  },
  {
    id: 'tx_04',
    txHash: '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    payerAddress: 'GBX...4Q3',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 300.00,
    amountNgn: 462000,
    fxRate: 1540,
    status: PAYMENT_STATUS.FAILED,
    source: 'Payment Link',
    timestamp: subDays(now, 1).toISOString(),
  },
  {
    id: 'tx_05',
    txHash: '5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    payerAddress: 'GBX...4Q3',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 850.25,
    amountNgn: 1309385,
    fxRate: 1540,
    status: PAYMENT_STATUS.COMPLETED,
    source: 'QR Code',
    timestamp: subDays(now, 2).toISOString(),
  },
  {
    id: 'tx_06',
    txHash: '6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
    payerAddress: 'GEA...3V9',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 200.00,
    amountNgn: 308000,
    fxRate: 1540,
    status: PAYMENT_STATUS.EXPIRED,
    source: 'Payment Link',
    timestamp: subDays(now, 3).toISOString(),
  },
];
