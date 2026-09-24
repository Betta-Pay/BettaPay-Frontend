import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPicker } from '../AccountPicker';

// Valid G... public keys (56 chars, base32 alphabet) — AccountPicker drops anything else.
const ACCOUNTS = [
  `GA${'A'.repeat(54)}`,
  `GB${'B'.repeat(54)}`,
  `GC${'C'.repeat(54)}`,
];

const mockSelectAccount = jest.fn();
let mockWalletState: {
  address: string | null;
  stellarAccounts: string[];
  selectAccount: typeof mockSelectAccount;
};

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: Object.assign(
    jest.fn((selector: (s: typeof mockWalletState) => unknown) => selector(mockWalletState)),
    { getState: jest.fn() },
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockWalletState = {
    address: ACCOUNTS[0],
    stellarAccounts: ACCOUNTS,
    selectAccount: mockSelectAccount,
  };
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

describe('AccountPicker public key sanitization', () => {
  it('drops malformed accounts instead of rendering them', () => {
    mockWalletState.stellarAccounts = [...ACCOUNTS, '<img src=x onerror=alert(1)>'];
    const { container } = render(<AccountPicker />);

    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('3 Accounts Presented')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders nothing when fewer than two valid accounts remain', () => {
    mockWalletState.stellarAccounts = [ACCOUNTS[0], 'not-a-key'];
    const { container } = render(<AccountPicker />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels options with the sanitized key and notifies the caller', async () => {
    const onAccountSelected = jest.fn();
    render(<AccountPicker onAccountSelected={onAccountSelected} />);

    await userEvent.click(screen.getByRole('option', { name: `Select account ${ACCOUNTS[2]}` }));

    expect(mockSelectAccount).toHaveBeenCalledWith(ACCOUNTS[2]);
    expect(onAccountSelected).toHaveBeenCalledWith(ACCOUNTS[2]);
  });
});
