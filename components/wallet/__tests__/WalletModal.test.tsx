import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WalletModal } from '../WalletModal';
import { useWalletStore } from '@/lib/store/walletStore';
import {
  getWalletConnectClient,
  isWalletConnectConfigured,
} from '@/lib/stellar/walletconnect';
import { createMockFreighterStore } from '@/lib/store/__mocks__/freighterProvider';

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: jest.fn(),
  resetWalletConnectClient: jest.fn(),
  isWalletConnectConfigured: jest.fn(),
  normalizeWalletNetwork: jest.fn((network: string) => network),
}));

jest.mock('../WalletConnectModal', () => ({
  WalletConnectModal: ({ open }: { open: boolean }) => (
    <div data-testid="wallet-connect-modal" data-open={String(open)} />
  ),
}));

describe('WalletModal WalletConnect configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWalletStore.setState({
      ...createMockFreighterStore(),
      walletModalOpen: true,
      walletConnectPending: false,
      network: 'testnet',
      connectError: null,
    });
  });

  it('disables WalletConnect and explains the missing configuration', () => {
    jest.mocked(isWalletConnectConfigured).mockReturnValue(false);

    render(<WalletModal />);

    const button = screen.getByRole('button', { name: /walletconnect/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', 'walletconnect-configuration-notice');
    expect(button.parentElement?.getAttribute('title')).toContain(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
    );

    fireEvent.click(button);

    expect(useWalletStore.getState().walletConnectPending).toBe(false);
    expect(getWalletConnectClient).not.toHaveBeenCalled();
    expect(screen.getByTestId('wallet-connect-modal')).toHaveAttribute('data-open', 'false');
  });

  it('keeps WalletConnect available when configured', async () => {
    jest.mocked(isWalletConnectConfigured).mockReturnValue(true);

    render(<WalletModal />);

    const button = screen.getByRole('button', { name: /walletconnect/i });
    expect(button).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(useWalletStore.getState().walletConnectPending).toBe(true);
    });
    expect(screen.getByTestId('wallet-connect-modal')).toHaveAttribute('data-open', 'true');
  });
});
