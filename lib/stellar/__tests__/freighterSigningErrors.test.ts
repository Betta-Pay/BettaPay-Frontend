import {
  signWithFreighter,
  signChallenge,
  FreighterSigningDeclinedError,
  FreighterCancelledError,
} from '../freighter';
import * as freighterApi from '@stellar/freighter-api';

jest.mock('@stellar/freighter-api', () => ({
  isAllowed: jest.fn(),
  setAllowed: jest.fn(),
  requestAccess: jest.fn(),
  getNetwork: jest.fn(),
  getAddress: jest.fn(),
  signTransaction: jest.fn(),
  signMessage: jest.fn(),
}));

describe('Freighter error mapping (#765)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps Freighter 3.x sign declines to FreighterSigningDeclinedError', async () => {
    (freighterApi.signTransaction as jest.Mock).mockResolvedValue({
      error: 'The user rejected the request to sign the transaction',
    });

    await expect(signWithFreighter('AAAA')).rejects.toThrow(
      FreighterSigningDeclinedError,
    );
  });

  it('maps 4.x decline wording ("declined to sign") to FreighterSigningDeclinedError', async () => {
    (freighterApi.signTransaction as jest.Mock).mockRejectedValue(
      new Error('User declined to sign the transaction'),
    );

    await expect(signWithFreighter('AAAA')).rejects.toThrow(
      FreighterSigningDeclinedError,
    );
  });

  it('maps message-signing declines to FreighterCancelledError', async () => {
    (freighterApi.signMessage as jest.Mock).mockResolvedValue({
      error: 'User rejected access',
    });

    await expect(signChallenge('GABC', 'nonce')).rejects.toThrow(
      FreighterCancelledError,
    );
  });
});
