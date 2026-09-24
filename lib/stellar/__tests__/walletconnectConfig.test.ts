/**
 * Issue #500: without NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID the relay rejects
 * pairing, so the client must fail fast with a typed configuration error
 * instead of opening a socket and producing a QR code that can never settle.
 */

jest.mock('@/lib/config', () => ({
  ...jest.requireActual('@/lib/config'),
  WALLETCONNECT_PROJECT_ID: '',
}));

import {
  WalletConnectClient,
  WalletConnectConfigError,
  isWalletConnectConfigured,
} from '@/lib/stellar/walletconnect';

describe('WalletConnect without a project id', () => {
  it('reports itself as not configured and warns once in dev', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(isWalletConnectConfigured()).toBe(false);
    expect(isWalletConnectConfigured()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID/);
    warn.mockRestore();
  });

  it('rejects connect() with a config error and never opens a relay socket', async () => {
    const wsFactory = jest.fn();
    const statuses: string[] = [];
    const client = new WalletConnectClient(wsFactory as never);
    client.onStatus((s) => statuses.push(s));

    await expect(client.connect()).rejects.toBeInstanceOf(WalletConnectConfigError);
    expect(wsFactory).not.toHaveBeenCalled();
    expect(statuses).toEqual([]);
  });
});
