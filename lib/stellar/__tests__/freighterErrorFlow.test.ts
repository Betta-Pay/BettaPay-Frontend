import {
  connectFreighter,
  restoreFreighterSession,
  FreighterNotInstalledError,
  FreighterCancelledError,
  FreighterNetworkMismatchError,
} from '../freighter';
import * as freighterApi from '@stellar/freighter-api';

jest.mock('@stellar/freighter-api', () => ({
  isAllowed: jest.fn(),
  setAllowed: jest.fn(),
  requestAccess: jest.fn(),
  getNetwork: jest.fn(),
  getAddress: jest.fn(),
}));

describe('Freighter Error Handling (#504)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws FreighterNotInstalledError when isAllowed throws not installed error', async () => {
    (freighterApi.isAllowed as jest.Mock).mockRejectedValue(new Error('Freighter is not installed'));

    await expect(connectFreighter()).rejects.toThrow(FreighterNotInstalledError);
  });

  it('throws FreighterCancelledError when user declines access during setAllowed or requestAccess', async () => {
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: false });
    (freighterApi.setAllowed as jest.Mock).mockRejectedValue(new Error('User declined access'));

    await expect(connectFreighter()).rejects.toThrow(FreighterCancelledError);
  });

  it('throws FreighterCancelledError when requestAccess returns error response', async () => {
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: true });
    (freighterApi.requestAccess as jest.Mock).mockResolvedValue({ error: 'User rejected connection' });

    await expect(connectFreighter()).rejects.toThrow(FreighterCancelledError);
  });

  it('returns address when access is granted and network matches', async () => {
    const mockAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: true });
    (freighterApi.requestAccess as jest.Mock).mockResolvedValue({ address: mockAddress });
    (freighterApi.getNetwork as jest.Mock).mockResolvedValue({
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    const address = await connectFreighter();
    expect(address).toBe(mockAddress);
  });
});

// ─── Network mismatch prompt (#791) ─────────────────────────────────────────
//
// The app is configured for Testnet in this test environment (the default
// when NEXT_PUBLIC_STELLAR_NETWORK is unset). If Freighter reports it is on
// Mainnet/Public instead, both connect and restore must proactively surface
// a FreighterNetworkMismatchError so the UI can prompt the user to switch,
// rather than letting a doomed transaction reach the signing step.
describe('Freighter network mismatch (#791)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAddress = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
  const PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015';

  it('connectFreighter throws FreighterNetworkMismatchError when Freighter is on a different network', async () => {
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: true });
    (freighterApi.requestAccess as jest.Mock).mockResolvedValue({ address: mockAddress });
    (freighterApi.getNetwork as jest.Mock).mockResolvedValue({
      networkPassphrase: PUBLIC_PASSPHRASE,
    });

    const error = await connectFreighter().catch((e) => e);
    expect(error).toBeInstanceOf(FreighterNetworkMismatchError);
    expect((error as FreighterNetworkMismatchError).expectedNetwork).toBe('Testnet');
    expect((error as FreighterNetworkMismatchError).freighterNetwork).toBe('Mainnet');
  });

  it('restoreFreighterSession throws FreighterNetworkMismatchError when Freighter is on a different network', async () => {
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: true });
    (freighterApi.getAddress as jest.Mock).mockResolvedValue({ address: mockAddress });
    (freighterApi.getNetwork as jest.Mock).mockResolvedValue({
      networkPassphrase: PUBLIC_PASSPHRASE,
    });

    await expect(restoreFreighterSession()).rejects.toBeInstanceOf(FreighterNetworkMismatchError);
  });

  it('does not throw when Freighter reports the same network the app expects', async () => {
    (freighterApi.isAllowed as jest.Mock).mockResolvedValue({ isAllowed: true });
    (freighterApi.getAddress as jest.Mock).mockResolvedValue({ address: mockAddress });
    (freighterApi.getNetwork as jest.Mock).mockResolvedValue({
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    await expect(restoreFreighterSession()).resolves.toBe(mockAddress);
  });
});
