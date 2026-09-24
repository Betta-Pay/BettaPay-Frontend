import { useWalletStore } from '../walletStore';
import { connectFreighter, restoreFreighterSession } from '@/lib/stellar/freighter';

const mockWalletConnectClient = {
  restoreSession: jest.fn().mockResolvedValue(undefined),
  onStatus: jest.fn(),
};

jest.mock('@/lib/stellar/freighter', () => ({
  connectFreighter: jest.fn(),
  restoreFreighterSession: jest.fn(),
  FreighterNotInstalledError: class FreighterNotInstalledError extends Error {},
  FreighterCancelledError: class FreighterCancelledError extends Error {},
  FreighterNetworkMismatchError: class FreighterNetworkMismatchError extends Error {
    expectedNetwork = 'Testnet';
    freighterNetwork = 'Mainnet';
  },
}));

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: jest.fn(() => mockWalletConnectClient),
  resetWalletConnectClient: jest.fn(),
}));

const STORAGE_KEY = 'bettapay_wallet_session';
const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('useWalletStore wallet session persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ balances: [{ asset_type: 'native', balance: '10.0000000' }] }),
    });
    useWalletStore.setState({
      address: null,
      stellarAccounts: [],
      isConnected: false,
      connector: null,
      network: 'testnet',
      balances: [],
      loading: false,
      isReconnecting: false,
      error: null,
      connectError: null,
      walletConnectPending: false,
      walletConnectSession: null,
      walletModalOpen: false,
    });
  });

  it('persists Freighter session metadata after connect', async () => {
    (connectFreighter as jest.Mock).mockResolvedValue(ADDRESS);

    await useWalletStore.getState().connect('freighter');

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
      connector: 'freighter',
      address: ADDRESS,
      stellarAccounts: [ADDRESS],
      network: 'testnet',
    });
  });

  it('restores an authenticated Freighter session and refreshes balances', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      connector: 'freighter',
      address: ADDRESS,
      stellarAccounts: [ADDRESS],
      network: 'testnet',
    }));
    (restoreFreighterSession as jest.Mock).mockResolvedValue(ADDRESS);

    await useWalletStore.getState().restoreSession(true);

    expect(useWalletStore.getState()).toMatchObject({
      address: ADDRESS,
      connector: 'freighter',
      isConnected: true,
      balances: [{ assetCode: 'XLM', balance: '10.0000000' }],
    });
  });

  it('restores an authenticated WalletConnect session and refreshes balances', async () => {
    const walletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [ADDRESS],
      address: ADDRESS,
      sessionKey: 'a'.repeat(64),
      sessionKeyVersion: 0,
      expiry: Math.floor(Date.now() / 1000) + 3600,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      connector: 'walletconnect',
      address: ADDRESS,
      stellarAccounts: [ADDRESS],
      network: 'testnet',
      walletConnectSession,
    }));

    await useWalletStore.getState().restoreSession(true);

    expect(mockWalletConnectClient.restoreSession).toHaveBeenCalledWith(walletConnectSession);
    expect(useWalletStore.getState()).toMatchObject({
      address: ADDRESS,
      connector: 'walletconnect',
      isConnected: true,
      balances: [{ assetCode: 'XLM', balance: '10.0000000' }],
    });
  });

  it('clears stale persisted state when the wallet rejects restore', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      connector: 'freighter',
      address: ADDRESS,
      stellarAccounts: [ADDRESS],
      network: 'testnet',
    }));
    (restoreFreighterSession as jest.Mock).mockResolvedValue(null);

    await useWalletStore.getState().restoreSession(true);

    expect(useWalletStore.getState().isConnected).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears persisted wallet state on disconnect', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, connector: 'freighter', address: ADDRESS, stellarAccounts: [ADDRESS], network: 'testnet' }));

    useWalletStore.getState().disconnect();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  describe('WalletConnect session expiry (issue #499)', () => {
    const baseSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [ADDRESS],
      address: ADDRESS,
      sessionKey: 'a'.repeat(64),
      sessionKeyVersion: 0,
    };

    const persist = (walletConnectSession: object) =>
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        connector: 'walletconnect',
        address: ADDRESS,
        stellarAccounts: [ADDRESS],
        network: 'testnet',
        walletConnectSession,
      }));

    it.each([
      ['expired', { ...baseSession, expiry: Math.floor(Date.now() / 1000) - 1 }],
      ['undated (persisted before expiry enforcement)', baseSession],
    ])('drops a %s session without touching the relay', async (_label, session) => {
      persist(session);

      await useWalletStore.getState().restoreSession(true);

      expect(mockWalletConnectClient.restoreSession).not.toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(useWalletStore.getState()).toMatchObject({
        isConnected: false,
        walletConnectSession: null,
        error: null,
      });
    });

    it('does not accumulate session state across repeated connect / disconnect', () => {
      for (let i = 0; i < 50; i += 1) {
        useWalletStore.getState().resolveWalletConnect({
          ...baseSession,
          topic: `topic-${i}`,
          expiry: Math.floor(Date.now() / 1000) + 3600,
        });
        expect(useWalletStore.getState().walletConnectSession?.topic).toBe(`topic-${i}`);
        useWalletStore.getState().disconnect();
      }

      const state = useWalletStore.getState();
      expect(state.walletConnectSession).toBeNull();
      expect(state.stellarAccounts).toEqual([]);
      expect(state.isConnected).toBe(false);
      expect(localStorage.length).toBe(0);
    });
  });
});
