
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionsPage from '@/app/(merchant)/transactions/page';

const mockPayments = [
  { id: 'pay_1', txHash: 'hash1', payerAddress: 'GAAA1111', merchantId: 'm_1', amountUsdc: 750, amountNgn: 1162500, fxRate: 1550, status: 'completed', source: 'Consulting', createdAt: new Date().toISOString() },
  { id: 'pay_2', txHash: 'hash2', payerAddress: 'GBBB2222', merchantId: 'm_1', amountUsdc: 45.5, amountNgn: 70525, fxRate: 1550, status: 'pending', source: 'E-commerce', createdAt: new Date().toISOString() },
];

jest.mock('@/lib/api/hooks', () => ({
  usePayments: () => ({ data: mockPayments, isLoading: false, error: null, refetch: jest.fn() }),
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

// Swap the Base UI Select primitives for plain native <select> elements so
// filter interactions can be driven with a single fireEvent.change instead
// of simulating Base UI's portal-based popup/pointer-event flow. Everything
// else exported from '@/components/ui' stays real.
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    Select: ({ value, onValueChange, children }: React.PropsWithChildren<{ value?: string; onValueChange?: (v: string) => void }>) => (
      <select
        aria-label="select"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
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

describe('TransactionsPage filters', () => {
  it('does not show the clear-all-filters button when no filters are active', () => {
    render(<TransactionsPage />);
    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
  });

  it('shows the clear-all-filters button once a filter is active, and resets all filters on click', () => {
    render(<TransactionsPage />);

    const selects = screen.getAllByLabelText('select');
    const [statusSelect] = selects;

    fireEvent.change(statusSelect, { target: { value: 'completed' } });

    const clearButton = screen.getByText('Clear all filters');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(screen.queryByText('Clear all filters')).not.toBeInTheDocument();
    expect((screen.getAllByLabelText('select')[0] as HTMLSelectElement).value).toBe('all');
  });

  it('renders seeded transactions by default', () => {
    render(<TransactionsPage />);
    expect(screen.getAllByText(/GAAA1111|GBBB2222/).length).toBeGreaterThan(0);
  });
});
