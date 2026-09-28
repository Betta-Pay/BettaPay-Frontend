import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Bootstrap the bundled i18next instance so `useAppTranslation` resolves real
// English text (and does not warn about a missing instance).
import '@/lib/i18n/config';
import { WalletConnectModal } from '../WalletConnectModal';

const connect = jest.fn().mockResolvedValue('wc:test-uri');
const onStatus = jest.fn();
const onSession = jest.fn();
const resetWalletConnectClient = jest.fn();
const isWalletConnectConfigured = jest.fn(() => true);
const getWalletConnectClient = jest.fn(() => ({
  connect,
  onStatus,
  onSession,
}));

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: (...args: unknown[]) => getWalletConnectClient(...args),
  resetWalletConnectClient: () => resetWalletConnectClient(),
  isWalletConnectConfigured: () => isWalletConnectConfigured(),
  WalletConnectConfigError: class WalletConnectConfigError extends Error {},
}));

jest.mock('@/components/ui', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    includeMargin: _includeMargin,
    ...props
  }: React.SVGProps<SVGSVGElement> & { includeMargin?: boolean }) => (
    <svg data-testid="qr" {...props} />
  ),
}));

describe('WalletConnectModal network wiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue('wc:test-uri');
    isWalletConnectConfigured.mockReturnValue(true);
  });

  it('rebuilds the pairing client with the active wallet network', async () => {
    const { rerender } = render(
      <WalletConnectModal
        open
        onOpenChange={jest.fn()}
        network="testnet"
        onConnected={jest.fn()}
      />,
    );

    await waitFor(() => expect(getWalletConnectClient).toHaveBeenCalledWith('testnet'));

    rerender(
      <WalletConnectModal
        open={false}
        onOpenChange={jest.fn()}
        network="testnet"
        onConnected={jest.fn()}
      />,
    );

    rerender(
      <WalletConnectModal
        open
        onOpenChange={jest.fn()}
        network="public"
        onConnected={jest.fn()}
      />,
    );

    await waitFor(() => expect(getWalletConnectClient).toHaveBeenCalledWith('public'));

    expect(getWalletConnectClient.mock.calls.map(([network]) => network)).toEqual([
      'testnet',
      'public',
    ]);
  });

  it('shows a configuration error instead of a QR code when the project id is missing (issue #500)', async () => {
    isWalletConnectConfigured.mockReturnValue(false);

    render(
      <WalletConnectModal open onOpenChange={jest.fn()} network="testnet" onConnected={jest.fn()} />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/walletconnect is not configured/i);
    expect(screen.getByText('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')).toBeInTheDocument();
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    expect(getWalletConnectClient).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it('renders the pairing QR code as before when the project id is set', async () => {
    render(
      <WalletConnectModal open onOpenChange={jest.fn()} network="testnet" onConnected={jest.fn()} />,
    );

    expect(await screen.findByTestId('qr')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders localized copy through the translation layer (issue #746)', async () => {
    render(
      <WalletConnectModal open onOpenChange={jest.fn()} network="testnet" onConnected={jest.fn()} />,
    );

    expect(await screen.findByText('Connect with WalletConnect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy WalletConnect URI to clipboard' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'WalletConnect QR code' })).toBeInTheDocument();
  });
});
