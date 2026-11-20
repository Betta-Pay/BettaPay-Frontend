import { useWalletStore } from '../walletStore';

describe('useWalletStore - Balance Refresh Retry Cap (#505)', () => {
  beforeEach(() => {
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      isConnected: true,
      connector: 'freighter',
      network: 'testnet',
      balances: [],
      isUnfunded: false,
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

  it('maps native, credit, and liquidity pool share balances safely', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        balances: [
          { asset_type: 'native', balance: '100.0000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GISSUER',
            balance: '25.0000000',
          },
          {
            asset_type: 'liquidity_pool_shares',
            liquidity_pool_id: 'POOL123',
            balance: '3.5000000',
          },
        ],
      }),
    });

    await useWalletStore.getState().refreshBalances();

    expect(useWalletStore.getState().balances).toEqual([
      { assetCode: 'XLM', balance: '100.0000000' },
      { assetCode: 'USDC', balance: '25.0000000', assetIssuer: 'GISSUER' },
      { assetCode: 'LP:POOL123', balance: '3.5000000' },
    ]);
    expect(useWalletStore.getState().balances.every((balance) => Boolean(balance.assetCode))).toBe(true);
  });

  it('sets an unfunded state and empty balances for Horizon 404 responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await useWalletStore.getState().refreshBalances();

    const state = useWalletStore.getState();
    expect(state.balances).toEqual([]);
    expect(state.isUnfunded).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
