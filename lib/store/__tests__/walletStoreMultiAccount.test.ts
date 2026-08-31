import { useWalletStore } from '../walletStore';
import type { WalletConnectSession } from '@/lib/stellar/walletconnect';

const mockWalletConnectClient = {
  restoreSession: jest.fn().mockResolvedValue(undefined),
  onStatus: jest.fn(),
};

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: jest.fn(() => mockWalletConnectClient),
  resetWalletConnectClient: jest.fn(),
}));

describe('useWalletStore - Multi Account Support (#503)', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: null,
      stellarAccounts: [],
      isConnected: false,
      connector: null,
      balances: [],
      loading: false,
      isReconnecting: false,
      error: null,
      connectError: null,
      walletConnectPending: false,
      walletConnectSession: null,
      walletModalOpen: false,
    });
    jest.restoreAllMocks();
  });

  it('stores all presented stellarAccounts when resolving WalletConnect session', () => {
    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB321',
      ],
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.address).toBe('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
    expect(state.stellarAccounts).toHaveLength(2);
    expect(state.stellarAccounts).toEqual(mockSession.stellarAccounts);
  });

  it('allows selecting an alternative presented account and triggers balance refresh', () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ balances: [{ asset_type: 'native', balance: '150.0000000' }] }),
    });
    global.fetch = fetchMock;

    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB321',
      ],
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);

    const secondAddress = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB321';
    useWalletStore.getState().selectAccount(secondAddress);

    const state = useWalletStore.getState();
    expect(state.address).toBe(secondAddress);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(secondAddress));
  });

  it('ignores account selection for unpresented accounts', () => {
    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);
    useWalletStore.getState().selectAccount('GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC123');

    expect(useWalletStore.getState().address).toBe('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
  });

  it('resets stellarAccounts on disconnect', () => {
    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: ['GACC1', 'GACC2'],
      address: 'GACC1',
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);
    useWalletStore.getState().disconnect();

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.address).toBeNull();
    expect(state.stellarAccounts).toEqual([]);
  });
});
