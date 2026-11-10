import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionsPage from '@/app/(merchant)/transactions/page';

const mockPayments = [
  {
    id: 'pay_1',
    txHash: 'hash1',
    payerAddress: 'GAAA1111',
    merchantId: 'm_1',
    amountUsdc: 750,
    amountNgn: 1162500,
    fxRate: 1550,
    status: 'completed',
    source: 'Invoice INV-1001',
    memo: 'MEMO-SOLAR-01',
    asset: 'USDC',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pay_2',
    txHash: 'hash2',
    payerAddress: 'GBBB2222',
    merchantId: 'm_1',
    amountUsdc: 120,
    amountNgn: 186000,
    fxRate: 1550,
    status: 'pending',
    source: 'Subscription XLM',
    memo: 'MEMO-XLM-99',
    asset: 'XLM',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pay_3',
    txHash: 'hash3',
    payerAddress: 'GCCC3333',
    merchantId: 'm_1',
    amountUsdc: 300,
    amountNgn: 465000,
    fxRate: 1550,
    status: 'completed',
    source: 'Euro Settlement',
    memo: 'MEMO-EURC-77',
    asset: 'EURC',
    createdAt: new Date().toISOString(),
  },
];

jest.mock('@/lib/api/hooks', () => ({
  usePayments: () => ({ data: mockPayments, isLoading: false, error: null, refetch: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/lib/store/offlineStore', () => ({
  useOfflineStore: (selector: (state: { isOnline: boolean }) => unknown) => selector({ isOnline: true }),
}));

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ key: index, index, start: index * 48 })),
    getTotalSize: () => count * 48,
  }),
}));

jest.mock('@/components/transactions/TransactionDrawer', () => ({
  TransactionDrawer: () => null,
}));

jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    Select: ({ value, onValueChange, children }: React.PropsWithChildren<{ value?: string; onValueChange?: (v: string) => void }>) => (
      <select
        aria-label="select"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
    SelectItem: ({ value, children }: React.PropsWithChildren<{ value?: string }>) => <option value={value}>{children}</option>,
  };
});

describe('TransactionsPage memo & asset filters and summary bar (#930)', () => {
  it('filters transactions by memo and asset type and updates total volume summary bar', () => {
    render(<TransactionsPage />);

    const summaryBar = screen.getByTestId('transactions-summary-bar');
    expect(summaryBar).toHaveTextContent(/Showing 3 matching transactions/i);
    expect(summaryBar).toHaveTextContent(/\$1,170\.00 USDC/i);

    // Filter by memo
    const memoInput = screen.getByPlaceholderText('Filter by memo...');
    fireEvent.change(memoInput, { target: { value: 'MEMO-EURC-77' } });

    expect(summaryBar).toHaveTextContent(/Showing 1 matching transaction/i);
    expect(summaryBar).toHaveTextContent(/\$300\.00 USDC/i);

    // Clear memo and filter by asset XLM
    fireEvent.change(memoInput, { target: { value: '' } });
    const [, assetSelect] = screen.getAllByLabelText('select');
    fireEvent.change(assetSelect, { target: { value: 'XLM' } });

    expect(summaryBar).toHaveTextContent(/Showing 1 matching transaction/i);
    expect(summaryBar).toHaveTextContent(/\$120\.00 USDC/i);
  });
});
