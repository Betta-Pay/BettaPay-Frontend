import { create } from 'zustand';
import { AssetBalance } from '../types';
import { connectFreighter, FreighterNotInstalledError, FreighterCancelledError, FreighterNetworkMismatchError } from '@/lib/stellar/freighter';
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
  /** Called by WalletConnectModal once a session is fully established. */
  resolveWalletConnect: (session: WalletConnectSession) => void;
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
          set({ address, stellarAccounts: [address], isConnected: true, connector: 'freighter', connectError: null });
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

  resolveWalletConnect: (session: WalletConnectSession) => {
    const stellarAccounts = session.stellarAccounts && session.stellarAccounts.length > 0
      ? session.stellarAccounts
      : session.address ? [session.address] : [];
    const selectedAddress = session.address && stellarAccounts.includes(session.address)
      ? session.address
      : stellarAccounts[0] || null;

    set({
      address: selectedAddress,
      stellarAccounts,
      isConnected: true,
      connector: 'walletconnect',
      connectError: null,
      walletConnectPending: false,
      walletConnectSession: {
        ...session,
        address: selectedAddress || session.address,
        stellarAccounts,
      },
    });
    get().refreshBalances();
  },

  selectAccount: (address: string) => {
    const { stellarAccounts, address: currentAddress } = get();
    if (!address || address === currentAddress) return;
    if (stellarAccounts.length > 0 && !stellarAccounts.includes(address)) return;

    set({ address, balances: [], loading: true, error: null });
    get().refreshBalances();
  },

  disconnect: () => {
    // Clean up WalletConnect WebSocket if it was the active connector
    if (get().connector === 'walletconnect') {
      resetWalletConnectClient();
    }
    set({
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
    });
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
          onRetry: (_err, attempt) => {
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
