import { useWalletStore } from '../walletStore';

describe('useWalletStore - Balance Refresh Retry Cap (#505)', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      isConnected: true,
      connector: 'freighter',
      network: 'testnet',
      balances: [],
      loading: false,
      isReconnecting: false,
      error: null,
      connectError: null,
      walletModalOpen: false,
    });
    jest.restoreAllMocks();
  });

  it('caps retries at 3 attempts and sets error state on failure', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('Horizon server unavailable'));
    global.fetch = fetchMock;

    await useWalletStore.getState().refreshBalances();

    const state = useWalletStore.getState();
    expect(state.loading).toBe(false);
    expect(state.isReconnecting).toBe(false);
    expect(state.error).toContain('Horizon server unavailable');
    // Initial fetch (1) + 3 retries = 4 total attempts
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('resets error and retry state when manual refresh is triggered', async () => {
    // First call fails
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
    await useWalletStore.getState().refreshBalances();

    expect(useWalletStore.getState().error).not.toBeNull();

    // Now horizon recovers
    const successFetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        balances: [{ asset_type: 'native', balance: '500.0000000' }],
      }),
    });
    global.fetch = successFetchMock;

    // Manual refresh call
    await useWalletStore.getState().refreshBalances();

    const state = useWalletStore.getState();
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.balances).toEqual([{ assetCode: 'XLM', balance: '500.0000000' }]);
  });
});
