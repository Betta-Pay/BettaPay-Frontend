import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPicker } from '../AccountPicker';

const KEY_A = `GA${'A'.repeat(54)}`;
const KEY_B = `GB${'B'.repeat(54)}`;

const selectAccount = jest.fn();
let walletState: { address: string | null; stellarAccounts: string[]; selectAccount: typeof selectAccount };

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: (s: typeof walletState) => unknown) => selector(walletState),
}));

describe('AccountPicker', () => {
  beforeEach(() => {
    selectAccount.mockReset();
    walletState = { address: KEY_A, stellarAccounts: [KEY_A, KEY_B], selectAccount };
  });

  it('renders one option per valid public key', () => {
    render(<AccountPicker />);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText('2 Accounts Presented')).toBeInTheDocument();
  });

  it('drops malformed accounts instead of rendering them', () => {
    const payload = '<img src=x onerror=alert(1)>';
    walletState.stellarAccounts = [KEY_A, KEY_B, payload];
    const { container } = render(<AccountPicker />);

    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders nothing when fewer than two valid accounts remain', () => {
    walletState.stellarAccounts = [KEY_A, 'not-a-key'];
    const { container } = render(<AccountPicker />);
    expect(container).toBeEmptyDOMElement();
  });

  it('selects the raw account and notifies the caller', async () => {
    const onAccountSelected = jest.fn();
    render(<AccountPicker onAccountSelected={onAccountSelected} />);

    await userEvent.click(screen.getByRole('option', { name: `Select account ${KEY_B}` }));

    expect(selectAccount).toHaveBeenCalledWith(KEY_B);
    expect(onAccountSelected).toHaveBeenCalledWith(KEY_B);
  });
});
