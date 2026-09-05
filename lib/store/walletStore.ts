import { create } from 'zustand';
import { AssetBalance } from '../types';
import { connectFreighter, restoreFreighterSession, FreighterNotInstalledError, FreighterCancelledError, FreighterNetworkMismatchError } from '@/lib/stellar/freighter';
import { getWalletConnectClient, resetWalletConnectClient, WalletConnectSession } from '@/lib/stellar/walletconnect';
import { retryWithBackoff } from '../utils/retry';
import { setWalletContextProvider } from '../errorReporting/context';
import { captureException } from '../errorReporting';

type Connector = 'freighter' | 'walletconnect' | null;

const NETWORK_URLS: Record<string, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
};

function getNetwork(): 'testnet' | 'public' {
  const val = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet').toLowerCase();
  if (val === 'mainnet' || val === 'public') return 'public';
  return 'testnet';
}

const WALLET_SESSION_KEY = 'bettapay_wallet_session';

type PersistedWalletSession = {
  version: 1;
  connector: Exclude<Connector, null>;
  address: string;
  stellarAccounts: string[];
  network: 'testnet' | 'public';
  walletConnectSession?: WalletConnectSession;
};

function readPersistedWalletSession(): PersistedWalletSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WALLET_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedWalletSession>;
    if (parsed.version !== 1 || !parsed.connector || !parsed.address) return null;
    if (parsed.connector !== 'freighter' && parsed.connector !== 'walletconnect') return null;
    return {
      version: 1,
      connector: parsed.connector,
      address: parsed.address,
      stellarAccounts: parsed.stellarAccounts?.length ? parsed.stellarAccounts : [parsed.address],
      network: parsed.network === 'public' ? 'public' : 'testnet',
      walletConnectSession: parsed.walletConnectSession,
    };
  } catch {
    return null;
  }
}

function persistWalletSession(snapshot: PersistedWalletSession) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable */
  }
}

export function clearPersistedWalletSession() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(WALLET_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}

function clearWalletConnectionState() {
  clearPersistedWalletSession();
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
}

function registerWalletConnectDisconnectHandler() {
  const client = getWalletConnectClient();
  client.onStatus((status) => {
    if (status === 'disconnected') {
      clearWalletConnectionState();
    }
  });
}

interface ConnectError {
  type: 'not_installed' | 'cancelled' | 'network_mismatch' | 'generic';
  message: string;
  raw?: string;
  expectedNetwork?: string;
  freighterNetwork?: string;
}

export interface WalletState {
  address: string | null;
  stellarAccounts: string[];
  isConnected: boolean;
  connector: Connector;
  network: 'testnet' | 'public';
  balances: AssetBalance[];
  loading: boolean;
  isReconnecting: boolean;
  error: string | null;
  connectError: ConnectError | null;

  // ── WalletConnect ──────────────────────────────────────────────────────────
  /** Resolves when a WalletConnect session is established. Set by the store so
   *  WalletModal can trigger the QR flow imperatively and await its result. */
  walletConnectPending: boolean;
  /** Stores the active session for later signing calls. */
  walletConnectSession: WalletConnectSession | null;

  // ── WalletModal State ──────────────────────────────────────────────────────
  walletModalOpen: boolean;
  setWalletModalOpen: (open: boolean) => void;

  connect: (connector?: Connector) => Promise<void>;
  restoreSession: (isAuthenticated: boolean) => Promise<void>;
  /** Called by WalletConnectModal once a session is fully established. */
  resolveWalletConnect: (session: WalletConnectSession) => void;
  /** Clears the pending WalletConnect QR flow without disconnecting a live wallet. */
  cancelWalletConnect: () => void;
  selectAccount: (address: string) => void;
  disconnect: () => void;
  clearConnectError: () => void;
  setNetwork: (network: 'testnet' | 'public') => void;
  refreshBalances: () => Promise<void>;
  /** Sign a transaction XDR via whichever connector is active. */
  signTransaction: (xdr: string) => Promise<string>;
  /** Sign a plaintext message/challenge via whichever connector is active. */
  signMessage: (message: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  stellarAccounts: [],
  isConnected: false,
  connector: null,
  network: getNetwork(),
  balances: [],
  loading: false,
  isReconnecting: false,
  error: null,
  connectError: null,
  walletModalOpen: false,
  walletConnectPending: false,
  walletConnectSession: null,

  connect: async (connector: Connector = 'freighter') => {
    try {
      set({ connectError: null });

      if (connector === 'freighter') {
        const address = await connectFreighter();
        if (address) {
          const network = get().network;
          set({ address, stellarAccounts: [address], isConnected: true, connector: 'freighter', connectError: null });
          persistWalletSession({
            version: 1,
            connector: 'freighter',
            address,
            stellarAccounts: [address],
            network,
          });
          get().refreshBalances();
        } else {
          throw new Error('Freighter connection failed');
        }
        return;
      }

      if (connector === 'walletconnect') {
        // Signal to WalletModal that it should open the WalletConnectModal.
        // The modal calls resolveWalletConnect() once the session is live.
        set({ walletConnectPending: true });
        // connect() returns here; the actual address is set via resolveWalletConnect.
        return;
      }

      throw new Error('Unsupported connector');
    } catch (error) {
      console.error('Failed to connect wallet', error);
      captureException(error, { source: 'wallet' });

      if (error instanceof FreighterNotInstalledError) {
        set({ connectError: { type: 'not_installed', message: error.message } });
      } else if (error instanceof FreighterCancelledError) {
        set({ connectError: { type: 'cancelled', message: error.message } });
      } else if (error instanceof FreighterNetworkMismatchError) {
        set({
          connectError: {
            type: 'network_mismatch',
            message: error.message,
            expectedNetwork: error.expectedNetwork,
            freighterNetwork: error.freighterNetwork,
          },
        });
      } else {
        set({
          connectError: {
            type: 'generic',
            message: error instanceof Error ? error.message : 'An unexpected error occurred',
            raw: String(error),
          },
        });
      }

      throw error;
    }
  },

  restoreSession: async (isAuthenticated: boolean) => {
    if (!isAuthenticated || get().isConnected) return;

    const persisted = readPersistedWalletSession();
    if (!persisted) return;

    set({ isReconnecting: true, error: null, connectError: null, network: persisted.network });

    try {
      if (persisted.connector === 'freighter') {
        const address = await restoreFreighterSession();
        if (!address) {
          clearWalletConnectionState();
          return;
        }

        const stellarAccounts = [address];
        set({
          address,
          stellarAccounts,
          isConnected: true,
          connector: 'freighter',
          isReconnecting: false,
        });
        persistWalletSession({ ...persisted, address, stellarAccounts, network: get().network });
        await get().refreshBalances();
        return;
      }

      if (!persisted.walletConnectSession?.sessionKey) {
        clearWalletConnectionState();
        return;
      }

      const client = getWalletConnectClient(persisted.network);
      await client.restoreSession(persisted.walletConnectSession);
      set({
        address: persisted.address,
        stellarAccounts: persisted.stellarAccounts,
        isConnected: true,
        connector: 'walletconnect',
        walletConnectSession: persisted.walletConnectSession,
        isReconnecting: false,
      });
      registerWalletConnectDisconnectHandler();
      await get().refreshBalances();
    } catch (error) {
      console.error('Failed to restore wallet session', error);
      captureException(error, { source: 'wallet' });
      clearPersistedWalletSession();
      if (persisted.connector === 'walletconnect') resetWalletConnectClient();
      set({
        address: null,
        stellarAccounts: [],
        isConnected: false,
        connector: null,
        balances: [],
        loading: false,
        isReconnecting: false,
        walletConnectSession: null,
        error: error instanceof Error ? error.message : 'Failed to restore wallet session',
      });
    }
  },

  resolveWalletConnect: (session: WalletConnectSession) => {
    const stellarAccounts = session.stellarAccounts && session.stellarAccounts.length > 0
      ? session.stellarAccounts
      : session.address ? [session.address] : [];
    const selectedAddress = session.address && stellarAccounts.includes(session.address)
      ? session.address
      : stellarAccounts[0] || null;

    const activeSession = {
      ...session,
      address: selectedAddress || session.address,
      stellarAccounts,
    };

    set({
      address: selectedAddress,
      stellarAccounts,
      isConnected: true,
      connector: 'walletconnect',
      connectError: null,
      walletConnectPending: false,
      walletConnectSession: activeSession,
    });
    if (selectedAddress) {
      persistWalletSession({
        version: 1,
        connector: 'walletconnect',
        address: selectedAddress,
        stellarAccounts,
        network: get().network,
        walletConnectSession: activeSession,
      });
    }
    registerWalletConnectDisconnectHandler();
    get().refreshBalances();
  },

  cancelWalletConnect: () => {
    set({ walletConnectPending: false });
  },

  selectAccount: (address: string) => {
    const { stellarAccounts, address: currentAddress, connector, walletConnectSession } = get();
    if (!address || address === currentAddress) return;
    if (stellarAccounts.length > 0 && !stellarAccounts.includes(address)) return;

    set({ address, balances: [], loading: true, error: null });
    if (connector === 'walletconnect' && walletConnectSession) {
      set({ walletConnectSession: { ...walletConnectSession, address, stellarAccounts } });
    }
    const persisted = readPersistedWalletSession();
    if (persisted) {
      const walletConnectSession = persisted.walletConnectSession
        ? { ...persisted.walletConnectSession, address, stellarAccounts }
        : persisted.walletConnectSession;
      persistWalletSession({
        ...persisted,
        address,
        stellarAccounts,
        walletConnectSession,
      });
    }
    get().refreshBalances();
  },

  disconnect: () => {
    const wasWalletConnect = get().connector === 'walletconnect';
    clearWalletConnectionState();
    // Clean up WalletConnect WebSocket if it was the active connector
    if (wasWalletConnect) {
      resetWalletConnectClient();
    }
  },

  clearConnectError: () => {
    set({ connectError: null });
  },

  setWalletModalOpen: (open: boolean) => {
    if (!open) {
      set({ walletModalOpen: false, connectError: null, walletConnectPending: false });
    } else {
      set({ walletModalOpen: true });
    }
  },

  setNetwork: (network: 'testnet' | 'public') => {
    const current = get().network;
    if (current === network) return;
    set({ network, balances: [], loading: true, error: null });
    const persisted = readPersistedWalletSession();
    if (persisted) {
      persistWalletSession({ ...persisted, network });
    }
    get().refreshBalances();
  },

  signTransaction: async (xdr: string): Promise<string> => {
    const { connector } = get();

    if (connector === 'freighter') {
      const { signWithFreighter } = await import('@/lib/stellar/freighter');
      const signed = await signWithFreighter(xdr);
      if (!signed) throw new Error('Freighter rejected the transaction');
      return signed;
    }

    if (connector === 'walletconnect') {
      const client = getWalletConnectClient();
      return client.signTransaction(xdr);
    }

    throw new Error('No wallet connected');
  },

  signMessage: async (message: string): Promise<string> => {
    const { connector, address } = get();

    if (connector === 'freighter') {
      const { signChallenge } = await import('@/lib/stellar/freighter');
      const sig = await signChallenge(address!, message);
      if (!sig) throw new Error('Freighter rejected signing the message');
      return sig;
    }

    if (connector === 'walletconnect') {
      const client = getWalletConnectClient();
      return client.signMessage(message, address!);
    }

    throw new Error('No wallet connected');
  },

  refreshBalances: async () => {
    const { address, network } = get();
    if (!address) return;

    set({ loading: true, error: null, isReconnecting: false });

    const horizonUrl = NETWORK_URLS[network];

    try {
      const result = await retryWithBackoff(
        async () => {
          const response = await fetch(`${horizonUrl}/accounts/${address}`);

          if (!response.ok) {
            if (response.status === 404) return 'NOT_FOUND' as const;
            throw new Error(`Horizon error: ${response.status} ${response.statusText}`);
          }

          return await response.json();
        },
        {
          maxRetries: 3,
          baseDelay: 500,
          maxDelay: 3000,
          isRetryable: () => true,
          onRetry: () => {
            set({ isReconnecting: true });
          },
        },
      );

      set({ isReconnecting: false });

      if (result === 'NOT_FOUND') {
        set({ balances: [], loading: false });
        return;
      }

      const data = result as {
        balances: Array<{
          asset_type: string;
          balance: string;
          asset_code?: string;
          asset_issuer?: string;
        }>;
      };

      const balances: AssetBalance[] = data.balances.map((b) => {
        if (b.asset_type === 'native') return { assetCode: 'XLM', balance: b.balance };
        return { assetCode: b.asset_code!, balance: b.balance, assetIssuer: b.asset_issuer };
      });

      set({ balances, loading: false, error: null });
    } catch (error) {
      console.error('Failed to refresh balances', error);
      captureException(error, { source: 'wallet' });
      set({
        loading: false,
        isReconnecting: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      });
    }
  },
}));

// Let error reports carry wallet context. Registered here rather than imported
// by the reporting module so the Stellar SDK is only pulled into bundles that
// actually use the wallet. The address is deliberately never exposed.
setWalletContextProvider(() => {
  const { isConnected, connector, network } = useWalletStore.getState();
  return { connected: isConnected, connector, network };
});
