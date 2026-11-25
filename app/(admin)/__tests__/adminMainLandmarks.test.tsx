/**
 * Guards issue #1117: `AdminShell` owns the single `<main id="main-content">`
 * landmark, so the merchants, compliance and transactions pages must not render
 * a second `<main>` inside it. Each page keeps its layout wrapper class and its
 * `<h1>`, so removing the nested landmark must not change what the page shows.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/admin/transactions',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// `next/dynamic` would pull the charts bundle in; the pages only need the slot.
jest.mock('next/dynamic', () => () => () => null);

jest.mock('@/components/admin/AdminAccess', () => ({
  AdminAccess: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AdminState: () => null,
  useAdminAccess: () => true,
  useAdminOnline: () => true,
}));

jest.mock('@/lib/hooks/useMerchants', () => ({
  useMerchants: () => ({
    merchants: [],
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    action: { mutateAsync: jest.fn(), isPending: false, error: null, reset: jest.fn() },
  }),
}));

jest.mock('@/lib/admin/client', () => ({ adminGet: jest.fn() }));

jest.mock('@/lib/hooks/useAdminPolling', () => ({
  useAdminPolling: () => ({
    data: { data: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/lib/hooks/useAdminTransactions', () => ({
  useAdminTransactions: () => ({
    transactions: [],
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
  }),
}));

jest.mock('@/components/transactions/TransactionDrawer', () => ({
  TransactionDrawer: () => null,
}));

import MerchantsPage from '../merchants/page';
import CompliancePage from '../compliance/page';
import AdminTransactionsPage from '../admin/transactions/page';

function renderPage(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Admin pages render no inner <main> landmark (issue #1117)', () => {
  it('merchants keeps its layout wrapper and heading without a nested main', () => {
    const { container } = renderPage(<MerchantsPage />);

    expect(container.querySelector('main')).toBeNull();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(container.querySelector('div.space-y-6')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Merchants' })).toBeInTheDocument();
  });

  it('compliance keeps its layout wrapper and heading without a nested main', () => {
    const { container } = renderPage(<CompliancePage />);

    expect(container.querySelector('main')).toBeNull();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(container.querySelector('div.space-y-8')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Compliance' })).toBeInTheDocument();
  });

  it('platform transactions keeps its layout wrapper and heading without a nested main', () => {
    const { container } = renderPage(<AdminTransactionsPage />);

    expect(container.querySelector('main')).toBeNull();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(container.querySelector('div.space-y-5')).not.toBeNull();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Platform transactions' }),
    ).toBeInTheDocument();
  });
});
