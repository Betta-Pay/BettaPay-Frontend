import {
  isAllowed,
  setAllowed,
  requestAccess,
  getNetwork,
  signTransaction,
  signMessage,
} from '@stellar/freighter-api';
import { STELLAR_NETWORK } from '../utils/constants';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
const getPassphrase = () => STELLAR_NETWORK.toUpperCase() === 'PUBLIC' ? PUBLIC_PASSPHRASE : TESTNET_PASSPHRASE;

export class FreighterNotInstalledError extends Error {
  constructor() {
    super('Freighter browser extension is not installed');
    this.name = 'FreighterNotInstalledError';
  }
}

export class FreighterCancelledError extends Error {
  constructor() {
    super('Connection request was cancelled');
    this.name = 'FreighterCancelledError';
  }
}

export class FreighterNetworkMismatchError extends Error {
  public expectedNetwork: string;
  public freighterNetwork: string;

  constructor(expectedNetwork: string, freighterNetwork: string) {
    super(`Freighter network mismatch: expected ${expectedNetwork}, got ${freighterNetwork}`);
    this.name = 'FreighterNetworkMismatchError';
    this.expectedNetwork = expectedNetwork;
    this.freighterNetwork = freighterNetwork;
  }
}

const FREIGHTER_NOT_INSTALLED_MSGS = [
  'freighter is not installed',
  'freighter does not exist',
  'window.freighter is undefined',
  'cannot read properties of undefined',
];

const USER_CANCELLED_MSGS = [
  'user declined access',
  'user rejected',
  'cancelled',
  'canceled',
];

function classifyFreighterError(error: unknown): Error {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

  if (FREIGHTER_NOT_INSTALLED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterNotInstalledError();
  }

  if (USER_CANCELLED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterCancelledError();
  }

  return error instanceof Error ? error : new Error(String(error));
}

// Detect whether Freighter is available. This tries a lightweight call and falls back safely.
export const isFreighterAvailable = async (): Promise<boolean> => {
  try {
    await isAllowed();
    return true;
  } catch {
    return false;
  }
};

async function checkNetworkMismatch(): Promise<void> {
  try {
    const networkResp = await getNetwork();
    if (!networkResp || !networkResp.networkPassphrase) return;

    const appPassphrase = getPassphrase();
    if (networkResp.networkPassphrase !== appPassphrase) {
      const networkLabel = networkResp.networkPassphrase === PUBLIC_PASSPHRASE ? 'Mainnet' : 'Testnet';
      const appLabel = appPassphrase === PUBLIC_PASSPHRASE ? 'Mainnet' : 'Testnet';
      throw new FreighterNetworkMismatchError(appLabel, networkLabel);
    }
  } catch (error) {
    if (error instanceof FreighterNetworkMismatchError) throw error;
  }
}

export const connectFreighter = async (): Promise<string | null> => {
  try {
    let allowedResp = await isAllowed();
    if (!allowedResp.isAllowed) {
      await setAllowed();
      allowedResp = await isAllowed();
    }

    if (allowedResp.isAllowed) {
      const accessResp = await requestAccess();
      if (!accessResp.error && accessResp.address) {
        await checkNetworkMismatch();
        return accessResp.address;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to connect Freighter', error);
    const classified = classifyFreighterError(error);
    throw classified;
  }
};

export const signWithFreighter = async (xdr: string): Promise<string | null> => {
  try {
    const signedTxResp = await signTransaction(xdr, {
      networkPassphrase: getPassphrase(),
    });

    if (signedTxResp.error) {
      console.error('Freighter sign error', signedTxResp.error);
      return null;
    }

    return signedTxResp.signedTxXdr;
  } catch (error) {
    console.error('Failed to sign transaction with Freighter', error);
    throw classifyFreighterError(error);
  }
};

export const signChallenge = async (address: string, challenge: string): Promise<string | null> => {
  try {
    const resp = (await signMessage(challenge, {
      address,
      networkPassphrase: getPassphrase(),
    })) as { error?: string; signature?: string; signedMessage?: string; [key: string]: unknown };

    if (resp.error) {
      console.error('Freighter sign challenge error', resp.error);
      return null;
    }

    const sig = resp.signature || resp.signedMessage;
    if (typeof sig === 'string') {
      return sig;
    }
    return null;
  } catch (error) {
    console.error('Failed to sign challenge with Freighter', error);
    throw classifyFreighterError(error);
  }
};
