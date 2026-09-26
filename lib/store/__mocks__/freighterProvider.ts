import type { WalletState } from '../walletStore';

export type MockFreighterConfig = {
  address?: string | null;
  error?: Error;
  allowed?: boolean;
};

export function createMockFreighterStore(config: MockFreighterConfig = {}): Partial<WalletState> {
  return {
    address: config.address ?? null,
    stellarAccounts: config.address ? [config.address] : [],
    isConnected: !!config.address,
    connector: config.address ? 'freighter' : null,
    balances: [],
    loading: false,
    isReconnecting: false,
    error: config.error?.message ?? null,
    connectError: config.error
      ? { type: 'generic', message: config.error.message }
      : null,
  };
}
