import {
  connectFreighter,
  FreighterNotInstalledError,
  FreighterCancelledError,
} from '../freighter';
import * as freighterApi from '@stellar/freighter-api';

jest.mock('@stellar/freighter-api', () => ({
  isAllowed: jest.fn(),
  setAllowed: jest.fn(),
  requestAccess: jest.fn(),
  getNetwork: jest.fn(),
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
