import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SettlementPage from '../page';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/settlement',
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const now = Date.now();
const twoDaysAgo = new Date(now - 2 * 24 * 3600 * 1000).toISOString();
const twentyDaysAgo = new Date(now - 20 * 24 * 3600 * 1000).toISOString();

const mockSettlements = [
  {
    id: 'set_1',
    merchantId: 'm_1',
    amountUsdc: 1200,
    amountNgn: 1920000,
    status: 'COMPLETED',
    createdAt: twoDaysAgo,
    txHash: 'tx_1',
    bankName: 'Zenith Bank PLC',
    accountNumber: '1234567890',
  },
  {
    id: 'set_2',
    merchantId: 'm_1',
    amountUsdc: 800,
    amountNgn: 1280000,
    status: 'PENDING',
    createdAt: twentyDaysAgo,
    txHash: 'tx_2',
    bankName: 'GTBank PLC',
    accountNumber: '0987654321',
  },
];

jest.mock('@/lib/api/hooks', () => ({
  useSettlements: () => ({
    data: mockSettlements,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useMerchantBankAccount: () => ({
    data: { bankName: 'Zenith Bank PLC', accountNumber: '1234567890' },
    isLoading: false,
  }),
}));

jest.mock('@/lib/store/offlineStore', () => ({
  useOfflineStore: (selector: (s: { isOnline: boolean }) => unknown) => selector({ isOnline: true }),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'm_1', role: 'merchant' } }),
}));

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: (s: { network: string }) => unknown) => selector({ network: 'testnet' }),
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn() }),
}));

jest.mock('@/components/settlement/SettlementConfirmation', () => ({
  SettlementConfirmation: () => null,
}));

jest.mock('@/components/settlement/InvoiceGenerator', () => ({
  InvoiceDownloadButton: () => <button type="button">Invoice</button>,
  BatchInvoiceDownload: () => <button type="button">Batch Invoice</button>,
}));

describe('SettlementPage date range & status filters with URL sync (#926)', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('filters settlements by status and date range and syncs parameters to the URL', () => {
    render(<SettlementPage />);

    expect(screen.getAllByText('Zenith Bank PLC').length).toBeGreaterThan(0);
    expect(screen.getAllByText('GTBank PLC').length).toBeGreaterThan(0);

    // Filter by status PENDING
    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    expect(screen.queryAllByText('Zenith Bank PLC')).toHaveLength(0);
    expect(screen.getAllByText('GTBank PLC').length).toBeGreaterThan(0);
    expect(mockPush).toHaveBeenLastCalledWith('/settlement?status=pending');

    // Reset status to ALL and filter by Last 7 Days
    fireEvent.change(statusSelect, { target: { value: 'ALL' } });
    const dateRangeSelect = screen.getByLabelText('Filter by date range');
    fireEvent.change(dateRangeSelect, { target: { value: '7d' } });

    expect(screen.getAllByText('Zenith Bank PLC').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('GTBank PLC')).toHaveLength(0);
    expect(mockPush).toHaveBeenLastCalledWith('/settlement?dateRange=7d');
  });
});
