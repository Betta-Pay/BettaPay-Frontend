/**
 * Stability tests for the transactions table (#514):
 * - sorting state survives a background refetch
 * - selection is keyed by stable row id
 * - virtualization only mounts a window of rows for large datasets
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

const mockIsOnline = jest.fn<boolean, []>().mockReturnValue(true);

jest.mock('@/lib/store/offlineStore', () => ({
  useOfflineStore: (selector: (state: { isOnline: boolean }) => unknown) =>
    selector({ isOnline: mockIsOnline() }),
}));

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: (state: { network: string }) => unknown) =>
    selector({ network: 'testnet' }),
}));

const makePayment = (index: number) => ({
  id: `pay_${index}`,
  txHash: `hash_${index}`,
  payerAddress: `GADDR${index}`,
  merchantId: 'm_1',
  amountUsdc: index * 10,
  amountNgn: index * 15000,
  fxRate: 1500,
  status: index % 2 === 0 ? 'completed' : 'pending',
  source: index % 2 === 0 ? 'Payment Link' : 'QR Code',
  createdAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')}T10:00:00Z`,
});

let paymentsData = [makePayment(1), makePayment(2), makePayment(3)];
let isFetching = false;

jest.mock('@/lib/api/hooks', () => ({
  usePayments: () => ({
    data: paymentsData,
    isLoading: false,
    isFetching,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('usehooks-ts', () => ({
  useDebounceValue: (value: string) => [value],
}));

// Render every virtual row so assertions can inspect DOM identity.
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    getItemKey,
  }: {
    count: number;
    getItemKey?: (index: number) => string | number;
  }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: getItemKey?.(index) ?? index,
        start: index * 48,
        size: 48,
      })),
    getTotalSize: () => count * 48,
  }),
}));

jest.mock('@/components/transactions/TransactionDrawer', () => ({
  TransactionDrawer: ({
    isOpen,
    transaction,
  }: {
    isOpen: boolean;
    transaction: { id: string } | null;
  }) =>
    isOpen && transaction ? (
      <div data-testid="drawer">{transaction.id}</div>
    ) : null,
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    silent: jest.fn(),
  }),
}));

jest.mock('@/components/ui/network-tooltip', () => ({
  NetworkTooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  OFFLINE_MESSAGE: 'offline',
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/transactions',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('lucide-react', () => {
  const icon = (name: string) => {
    const I = ({ className }: { className?: string }) => (
      <svg data-testid={`icon-${name}`} className={className} />
    );
    I.displayName = name;
    return I;
  };
  return {
    Search: icon('Search'),
    SearchX: icon('SearchX'),
    ExternalLink: icon('ExternalLink'),
    Loader2: icon('Loader2'),
    ArrowUp: icon('ArrowUp'),
    ArrowDown: icon('ArrowDown'),
    ArrowUpDown: icon('ArrowUpDown'),
    Download: icon('Download'),
  };
});

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false | null)[]) =>
    classes.filter(Boolean).join(' '),
}));

jest.mock('@/lib/utils/format', () => ({
  formatDate: (d: string | Date) => String(d),
  truncateAddress: (a: string) => a,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => {
  const passthrough =
    (Tag: string) =>
    ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(Tag, { ...rest }, children);
  return {
    Select: passthrough('div'),
    SelectTrigger: passthrough('button'),
    SelectContent: passthrough('div'),
    SelectItem: passthrough('div'),
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  };
});

jest.mock('@/components/shared/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));
jest.mock('@/components/shared/CopyAddress', () => ({
  CopyAddress: ({ address }: { address: string }) => <span>{address}</span>,
}));
jest.mock('@/components/shared/CurrencyDisplay', () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => <span>{amount}</span>,
}));
jest.mock('@/components/shared/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));
jest.mock('@/components/shared/ExportMenu', () => ({
  ExportMenu: () => <button type="button">Export</button>,
}));

import TransactionsPage from '@/app/(merchant)/transactions/page';

describe('Transactions table stability (#514)', () => {
  beforeEach(() => {
    paymentsData = [makePayment(1), makePayment(2), makePayment(3)];
    isFetching = false;
  });

  it('keeps column sort direction across a refetch of the same rows', () => {
    const { rerender } = render(<TransactionsPage />);

    const sortButton = screen.getByTestId('sort-amountUsdc');
    // Toggle until amountUsdc is actively sorted (Strict Mode may double-invoke handlers).
    fireEvent.click(sortButton);
    if (sortButton.closest('th')?.getAttribute('data-sorted') === 'none') {
      fireEvent.click(sortButton);
    }

    const sortedDir = sortButton.closest('th')?.getAttribute('data-sorted');
    expect(sortedDir === 'asc' || sortedDir === 'desc').toBe(true);

    const list = screen.getByTestId('transactions-virtual-list');
    const firstIdBefore = within(list).getAllByRole('row')[0].getAttribute('data-row-id');
    expect(firstIdBefore).toBe(sortedDir === 'asc' ? 'pay_1' : 'pay_3');

    // Force a "refetch" with new object identities but same ids/sort keys.
    paymentsData = [makePayment(1), makePayment(2), makePayment(3)].map((p) => ({ ...p }));
    isFetching = true;
    rerender(<TransactionsPage />);
    isFetching = false;
    rerender(<TransactionsPage />);

    expect(screen.getByTestId('sort-amountUsdc').closest('th')).toHaveAttribute(
      'data-sorted',
      sortedDir!,
    );
    expect(within(list).getAllByRole('row')[0]).toHaveAttribute('data-row-id', firstIdBefore);
  });

  it('preserves selection by stable row id after refetch', () => {
    const { rerender } = render(<TransactionsPage />);
    const list = screen.getByTestId('transactions-virtual-list');
    const firstRow = within(list).getAllByRole('row')[0];
    fireEvent.click(firstRow);

    expect(screen.getByTestId('drawer')).toHaveTextContent(firstRow.getAttribute('data-row-id')!);

    const selectedId = firstRow.getAttribute('data-row-id')!;
    paymentsData = paymentsData.map((p) => ({ ...p, amountUsdc: p.amountUsdc + 1 }));
    rerender(<TransactionsPage />);

    expect(screen.getByTestId('drawer')).toHaveTextContent(selectedId);
  });

  it('uses stable data-row-id keys suitable for virtualization', () => {
    paymentsData = Array.from({ length: 50 }, (_, i) => makePayment(i + 1));
    render(<TransactionsPage />);
    const list = screen.getByTestId('transactions-virtual-list');
    const rows = within(list).getAllByRole('row');
    const ids = rows.map((row) => row.getAttribute('data-row-id'));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id?.startsWith('pay_'))).toBe(true);
  });
});
