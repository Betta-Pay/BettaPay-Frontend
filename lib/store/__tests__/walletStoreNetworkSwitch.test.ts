import { useWalletStore } from '../walletStore';
import { createMockFreighterStore } from '../__mocks__/freighterProvider';

const ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('useWalletStore network switch state reset (#903)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('synchronously clears balances, errors, and sets loading=true when switching networks', async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    ) as unknown as typeof fetch;

    useWalletStore.setState({
      ...createMockFreighterStore(),
      address: ADDRESS,
      stellarAccounts: [ADDRESS],
      isConnected: true,
      connector: 'freighter',
      network: 'testnet',
      balances: [
        { assetCode: 'XLM', balance: '500.0000000' },
        { assetCode: 'USDC', balance: '1250.0000000', assetIssuer: ADDRESS },
      ],
      loading: false,
      error: 'Previous error',
      connectError: { type: 'generic', message: 'Stale connect error' },
    });

    useWalletStore.getState().setNetwork('public');

    // Immediately after setNetwork('public'), before the Horizon fetch resolves:
    const immediateState = useWalletStore.getState();
    expect(immediateState.network).toBe('public');
    expect(immediateState.balances).toEqual([]);
    expect(immediateState.loading).toBe(true);
    expect(immediateState.error).toBeNull();
    expect(immediateState.connectError).toBeNull();

    // Resolve the Horizon fetch for the new network:
    resolveFetch?.({
      ok: true,
      json: async () => ({
        balances: [{ asset_type: 'native', balance: '42.0000000' }],
      }),
    });

    await new Promise((r) => setTimeout(r, 0));

    const settledState = useWalletStore.getState();
    expect(settledState.network).toBe('public');
    expect(settledState.loading).toBe(false);
    expect(settledState.balances).toEqual([{ assetCode: 'XLM', balance: '42.0000000' }]);
  });

  it('does not reset balances or trigger a fetch when setNetwork is called with the already-active network', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    useWalletStore.setState({
      ...createMockFreighterStore(),
      address: ADDRESS,
      isConnected: true,
      network: 'testnet',
      balances: [{ assetCode: 'XLM', balance: '100.0000000' }],
      loading: false,
    });

    useWalletStore.getState().setNetwork('testnet');

    expect(useWalletStore.getState().balances).toEqual([
      { assetCode: 'XLM', balance: '100.0000000' },
    ]);
    expect(useWalletStore.getState().loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
