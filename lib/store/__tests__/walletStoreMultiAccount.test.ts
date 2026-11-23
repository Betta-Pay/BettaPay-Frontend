import { useWalletStore } from '../walletStore';
import type { WalletConnectSession } from '@/lib/stellar/walletconnect';
import { createMockFreighterStore } from '../__mocks__/freighterProvider';

const firstAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const secondAddress = 'GCATS5YOVB6ROX2WUNKGNQ2MP3GMXDMKSG2O4N5CLX3A6W4PZGZZI55U';
const unpresentedAddress = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const originalRefreshBalances = useWalletStore.getState().refreshBalances;

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
      ...createMockFreighterStore(),
      walletConnectPending: false,
      walletConnectSession: null,
      walletModalOpen: false,
      refreshBalances: originalRefreshBalances,
    });
    jest.restoreAllMocks();
  });

  it('stores all presented stellarAccounts when resolving WalletConnect session', () => {
    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [firstAddress, secondAddress],
      address: firstAddress,
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);

    const state = useWalletStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.address).toBe(firstAddress);
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
      stellarAccounts: [firstAddress, secondAddress],
      address: firstAddress,
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);

    useWalletStore.getState().selectAccount(secondAddress);

    const state = useWalletStore.getState();
    expect(state.address).toBe(secondAddress);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(secondAddress),
      // The refresh passes an AbortSignal so a superseded request is cancelled.
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('rejects invalid addresses without changing wallet state or refreshing balances', () => {
    const refreshBalances = jest.fn();
    useWalletStore.setState({
      ...createMockFreighterStore({ address: firstAddress }),
      stellarAccounts: [firstAddress, secondAddress],
      balances: [{ assetCode: 'XLM', balance: '42' }],
      refreshBalances,
    });

    useWalletStore.getState().selectAccount('not-a-stellar-address');

    const state = useWalletStore.getState();
    expect(state.address).toBe(firstAddress);
    expect(state.stellarAccounts).toEqual([firstAddress, secondAddress]);
    expect(state.balances).toEqual([{ assetCode: 'XLM', balance: '42' }]);
    expect(state.loading).toBe(false);
    expect(refreshBalances).not.toHaveBeenCalled();
  });

  it('ignores account selection for unpresented accounts', () => {
    const mockSession: WalletConnectSession = {
      topic: 'topic-123',
      peerMetadata: { name: 'Test Wallet', description: '', url: '', icons: [] },
      stellarAccounts: [firstAddress],
      address: firstAddress,
    };

    useWalletStore.getState().resolveWalletConnect(mockSession);
    useWalletStore.getState().selectAccount(unpresentedAddress);

    expect(useWalletStore.getState().address).toBe(firstAddress);
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
