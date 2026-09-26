import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { WalletActivityHistory } from '@/components/wallet/WalletActivityHistory';
import { useWalletStore } from '@/lib/store/walletStore';
import { useAuthStore } from '@/lib/store/authStore';

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

  const ACTIVE_ACCOUNT = 'GB22222222222222222222222222222222222222222222222222222222';
  const SECOND_ACCOUNT = `GA${'A'.repeat(54)}`;

  beforeEach(() => {
    jest.clearAllMocks();
    // The component reads the active account from the store (issue #761).
    useWalletStore.setState({
      address: ACTIVE_ACCOUNT,
      network: 'testnet',
    });
    useAuthStore.setState({ user: null });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders "Wallet not connected" empty state when the store has no address', () => {
    useWalletStore.setState({ address: null });

    render(<WalletActivityHistory />);

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

    render(<WalletActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText(/Payment from GA11...1111/i)).toBeInTheDocument();
    });

    expect(screen.getByText('+150.50 USDC')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View transaction on Stellar Explorer/i })).toHaveAttribute(
      'href',
      expect.stringContaining('abc123hash')
    );
  });

  it('follows the store when another account is selected (no prop drilling)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ _embedded: { records: [] } }),
    } as Response);

    render(<WalletActivityHistory />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    act(() => {
      useWalletStore.setState({ address: SECOND_ACCOUNT });
    });

    await waitFor(() => {
      const urls = (global.fetch as jest.Mock).mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes(SECOND_ACCOUNT))).toBe(true);
    });
  });

  it('renders "No wallet activity yet" when account has no on-chain payments', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: { records: [] },
      }),
    } as Response);

    render(<WalletActivityHistory />);

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

    render(<WalletActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText(/Horizon error: 500 Internal Server Error/i)).toBeInTheDocument();
    });
  });
});
