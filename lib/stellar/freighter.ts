import {
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
  signMessage,
} from '@stellar/freighter-api';
import { STELLAR_NETWORK } from '../utils/constants';

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
const PUBLIC_PASSPHRASE = 'Public Global Stellar Network ; September 2015';
const getPassphrase = () => STELLAR_NETWORK.toUpperCase() === 'PUBLIC' ? PUBLIC_PASSPHRASE : TESTNET_PASSPHRASE;

export const FREIGHTER_LOCKED_PROMPT = 'Please unlock your Freighter wallet';

export type FreighterExtensionState =
  | 'not_installed'
  | 'not_allowed'
  | 'locked'
  | 'unlocked';

export class FreighterNotInstalledError extends Error {
  constructor() {
    super('Freighter browser extension is not installed');
    this.name = 'FreighterNotInstalledError';
  }
}

export class FreighterLockedError extends Error {
  constructor(message = `${FREIGHTER_LOCKED_PROMPT} to continue.`) {
    super(message);
    this.name = 'FreighterLockedError';
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

export class FreighterSigningDeclinedError extends Error {
  constructor() {
    super('Transaction was declined in Freighter — no funds were moved. Review the details and try again.');
    this.name = 'FreighterSigningDeclinedError';
  }
}

const FREIGHTER_NOT_INSTALLED_MSGS = [
  'freighter is not installed',
  'freighter does not exist',
  'window.freighter is undefined',
  'cannot read properties of undefined',
  'not installed',
  'freighter api is not available',
];

const FREIGHTER_LOCKED_MSGS = [
  'freighter is locked',
  'wallet is locked',
  'extension is locked',
  'account is locked',
  'please unlock',
  'unlock your freighter',
  'unlock your wallet',
  'locked',
  'no public key',
  'user has no key',
];

// Freighter rejects sign requests with these strings when the user declines
// in the popup (4.x wording included).
const SIGNING_DECLINED_MSGS = [
  'declined to sign',
  'refused to sign',
  'rejected the transaction',
  'rejected the signing',
  // Freighter 3.x wording when the user declines the sign popup.
  'rejected the request to sign',
];

const USER_CANCELLED_MSGS = [
  'user declined access',
  'user rejected',
  'the user rejected this request',
  'user refused to sign this transaction',
  'cancelled',
  'canceled',
  'permission denied',
  'access denied',
  'declined',
];

function classifyFreighterError(error: unknown): Error {
  // Already-mapped application errors must survive a second pass: callers
  // classify inside `catch` blocks too, and re-classifying would discard the
  // specific error (e.g. a signing decline) for a broader match.
  if (
    error instanceof FreighterNotInstalledError ||
    error instanceof FreighterLockedError ||
    error instanceof FreighterCancelledError ||
    error instanceof FreighterNetworkMismatchError ||
    error instanceof FreighterSigningDeclinedError
  ) {
    return error;
  }

  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

  if (FREIGHTER_NOT_INSTALLED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterNotInstalledError();
  }

  if (FREIGHTER_LOCKED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterLockedError();
  }

  if (SIGNING_DECLINED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterSigningDeclinedError();
  }

  if (USER_CANCELLED_MSGS.some((k) => msg.includes(k))) {
    return new FreighterCancelledError();
  }

  return error instanceof Error ? error : new Error(String(error));
}

// Freighter API calls often fail with a raw { error: string } payload instead
// of a thrown Error (signTransaction/signMessage results). Map those strings
// to the standardized application errors above so the UI never shows raw
// extension internals.
function throwFreighterError(raw: string): never {
  throw classifyFreighterError(raw);
}

// Detect whether Freighter is available. This tries a lightweight call and falls back safely.
export const isFreighterAvailable = async (): Promise<boolean> => {
  try {
    const resp = (await isAllowed()) as { isAllowed?: boolean; error?: string } | undefined;
    if (resp?.error && FREIGHTER_NOT_INSTALLED_MSGS.some((k) => resp.error!.toLowerCase().includes(k))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Inspects Freighter extension installation, permission, and lock status (#899).
 */
export const detectFreighterState = async (): Promise<FreighterExtensionState> => {
  try {
    const allowedResp = (await isAllowed()) as { isAllowed?: boolean; error?: string } | undefined;
    if (allowedResp?.error) {
      const classified = classifyFreighterError(allowedResp.error);
      if (classified instanceof FreighterNotInstalledError) return 'not_installed';
      if (classified instanceof FreighterLockedError) return 'locked';
    }
    if (!allowedResp?.isAllowed) {
      return 'not_allowed';
    }
    const addressResp = await getAddress();
    if (addressResp?.error) {
      const classified = classifyFreighterError(addressResp.error);
      if (classified instanceof FreighterLockedError) return 'locked';
      if (classified instanceof FreighterNotInstalledError) return 'not_installed';
    }
    if (!addressResp?.address) {
      return 'locked';
    }
    return 'unlocked';
  } catch (error) {
    const classified = classifyFreighterError(error);
    if (classified instanceof FreighterLockedError) return 'locked';
    return 'not_installed';
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
    let allowedResp = (await isAllowed()) as { isAllowed?: boolean; error?: string } | undefined;
    if (allowedResp?.error) {
      throw classifyFreighterError(allowedResp.error);
    }
    if (!allowedResp || !allowedResp.isAllowed) {
      try {
        await setAllowed();
        allowedResp = (await isAllowed()) as { isAllowed?: boolean; error?: string } | undefined;
      } catch (err) {
        throw classifyFreighterError(err);
      }
    }

    if (!allowedResp || !allowedResp.isAllowed) {
      throw new FreighterCancelledError();
    }

    const accessResp = await requestAccess();
    if (accessResp.error) {
      throw classifyFreighterError(accessResp.error);
    }

    if (accessResp.address) {
      await checkNetworkMismatch();
      return accessResp.address;
    }

    // When the extension is allowed (`isAllowed: true`) but `requestAccess()`
    // returns an empty address without a cancellation error, the wallet is locked.
    throw new FreighterLockedError();
  } catch (error) {
    console.error('Failed to connect Freighter', error);
    const classified = classifyFreighterError(error);
    throw classified;
  }
};

export const restoreFreighterSession = async (): Promise<string | null> => {
  try {
    const allowedResp = await isAllowed();
    if (!allowedResp?.isAllowed) return null;

    const addressResp = await getAddress();
    if (addressResp.error) {
      throw classifyFreighterError(addressResp.error);
    }

    if (!addressResp.address) return null;
    await checkNetworkMismatch();
    return addressResp.address;
  } catch (error) {
    console.error('Failed to restore Freighter session', error);
    throw classifyFreighterError(error);
  }
};

export const signWithFreighter = async (xdr: string): Promise<string | null> => {
  try {
    const signedTxResp = await Promise.race([
      signTransaction(xdr, { networkPassphrase: getPassphrase() }),
      new Promise<{ error?: string; signedTxXdr?: string }>((_, reject) =>
        setTimeout(() => reject(new Error('Signing timeout')), 60000)
      )
    ]);

    if (signedTxResp.error) {
      console.error('Freighter sign error', signedTxResp.error);
      throwFreighterError(signedTxResp.error);
    }

    return signedTxResp.signedTxXdr || null;
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
      throwFreighterError(resp.error);
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
