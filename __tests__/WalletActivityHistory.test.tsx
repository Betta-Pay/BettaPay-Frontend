import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletActivityHistory } from '@/components/wallet/WalletActivityHistory';
import { useWalletStore } from '@/lib/store/walletStore';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Mock tanstack virtual
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: String(index),
        size: 60,
        start: index * 60,
      })),
  }),
}));

describe('WalletActivityHistory (Issue #570)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    useWalletStore.setState({
      address: null,
      network: 'testnet',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders "Wallet not connected" empty state when no address is present', () => {
    render(<WalletActivityHistory />, { wrapper: createWrapper() });

    expect(screen.getByText('Wallet not connected')).toBeInTheDocument();
    expect(
      screen.getByText(/Connect your Stellar wallet or provide an account address/i)
    ).toBeInTheDocument();
  });

  it('fetches on-chain payments from Horizon and displays real transactions', async () => {
    const mockRecords = [
      {
        id: 'tx_1',
        from: 'GA11111111111111111111111111111111111111111111111111111111',
        to: 'GB22222222222222222222222222222222222222222222222222222222',
        amount: '150.5000000',
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        transaction_hash: 'abc123hash',
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: { records: mockRecords },
      }),
    } as Response);

    render(
      <WalletActivityHistory address="GB22222222222222222222222222222222222222222222222222222222" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText(/Payment from GA11...1111/i)).toBeInTheDocument();
    });

    expect(screen.getByText('+150.50 USDC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View transaction on Stellar Explorer/i })).toHaveAttribute(
      'href',
      expect.stringContaining('abc123hash')
    );
  });

  it('renders "No wallet activity yet" when account has no on-chain payments', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: { records: [] },
      }),
    } as Response);

    render(
      <WalletActivityHistory address="GB22222222222222222222222222222222222222222222222222222222" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText('No wallet activity yet')).toBeInTheDocument();
    });
  });

  it('handles Horizon API errors with error message', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    render(
      <WalletActivityHistory address="GB22222222222222222222222222222222222222222222222222222222" />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(screen.getByText(/Horizon error: 500 Internal Server Error/i)).toBeInTheDocument();
    });
  });
});
