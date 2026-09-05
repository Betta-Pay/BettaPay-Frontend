import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { WalletConnectModal } from '../WalletConnectModal';

const connect = jest.fn().mockResolvedValue('wc:test-uri');
const onStatus = jest.fn();
const onSession = jest.fn();
const resetWalletConnectClient = jest.fn();
const getWalletConnectClient = jest.fn(() => ({
  connect,
  onStatus,
  onSession,
}));

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: (...args: unknown[]) => getWalletConnectClient(...args),
  resetWalletConnectClient: () => resetWalletConnectClient(),
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
});
