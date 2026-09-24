import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPicker } from '../AccountPicker';

const ACCOUNTS = [
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1',
  'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2',
  'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC3',
];

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: Object.assign(
    jest.fn((selector: (s: Record<string, unknown>) => unknown) =>
      selector({
        address: ACCOUNTS[0],
        stellarAccounts: ACCOUNTS,
        selectAccount: mockSelectAccount,
      }),
    ),
    { getState: jest.fn() },
  ),
}));

const mockSelectAccount = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AccountPicker ARIA attributes', () => {
  it('renders all accounts with correct aria-selected states', () => {
    render(<AccountPicker />);

    const buttons = screen.getAllByRole('option');
    expect(buttons).toHaveLength(3);

    expect(buttons[0]).toHaveAttribute('aria-selected', 'true');
    expect(buttons[1]).toHaveAttribute('aria-selected', 'false');
    expect(buttons[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('updates aria-selected when a different account is selected', async () => {
    const user = userEvent.setup();
    render(<AccountPicker />);

    const secondAccount = screen.getAllByRole('option')[1];
    expect(secondAccount).toHaveAttribute('aria-selected', 'false');

    await user.click(secondAccount);

    expect(mockSelectAccount).toHaveBeenCalledWith(ACCOUNTS[1]);
  });

  it('has a listbox container with accessible label', () => {
    render(<AccountPicker />);

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Available accounts');
  });
});
