import { subHours, subDays } from 'date-fns';
import { PaymentStatus } from '../utils/constants';

export interface Transaction {
  id: string;
  txHash: string;
  payerAddress: string;
  merchantAddress: string;
  amountUsdc: number;
  amountNgn: number;
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
    status: 'success',
    source: 'Payment Link',
    timestamp: subHours(now, 2).toISOString(),
    stellarOpId: '1234567890123456789',
  },
  {
    id: 'tx_02',
    txHash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    payerAddress: 'GCY...8R2',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 45.50,
    amountNgn: 70525,
    fxRate: 1550,
    status: 'success',
    source: 'QR Code',
    timestamp: subHours(now, 5).toISOString(),
    stellarOpId: '2345678901234567890',
  },
  {
    id: 'tx_03',
    txHash: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    payerAddress: 'GDZ...1T5',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 12000.00,
    amountNgn: 18600000,
    fxRate: 1550,
    status: 'pending',
    source: 'API',
    timestamp: subHours(now, 12).toISOString(),
    stellarOpId: '3456789012345678901',
  },
  {
    id: 'tx_04',
    txHash: '4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
    payerAddress: 'GBX...4Q3',
    merchantAddress: 'GDM...9L1',
    amountUsdc: 300.00,
    amountNgn: 462000,
    fxRate: 1540,
    status: 'failed',
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
    status: 'success',
    source: 'QR Code',
    timestamp: subDays(now, 2).toISOString(),
    stellarOpId: '5678901234567890123',
  },
];
