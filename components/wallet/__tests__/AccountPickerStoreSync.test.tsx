/**
 * components/wallet/__tests__/AccountPickerStoreSync.test.tsx
 *
 * Issue #761 testing note — the picker must keep the globally active account in
 * sync. It reads the address straight from `walletStore` instead of receiving
 * it through props, so these tests drive the real store rather than a mock.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPicker } from '../AccountPicker';
import { useWalletStore } from '@/lib/store/walletStore';

const ACCOUNTS = [`GA${'A'.repeat(54)}`, `GB${'B'.repeat(54)}`];

const originalFetch = global.fetch;

beforeEach(() => {
  // `selectAccount` refreshes balances over the network; keep that inert.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ balances: [] }),
  } as Response) as unknown as typeof fetch;

  useWalletStore.setState({
    address: ACCOUNTS[0],
    stellarAccounts: ACCOUNTS,
    isConnected: true,
    connector: 'freighter',
    balances: [],
    loading: false,
    error: null,
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('AccountPicker global account sync (#761)', () => {
  it('marks the account held in the store as the selected one', () => {
    useWalletStore.setState({ address: ACCOUNTS[1] });

    render(<AccountPicker />);

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('updates the globally active account in the store when an account is picked', async () => {
    const user = userEvent.setup();
    render(<AccountPicker />);

    await user.click(screen.getByRole('option', { name: /Select account GB/ }));

    expect(useWalletStore.getState().address).toBe(ACCOUNTS[1]);
  });
});
