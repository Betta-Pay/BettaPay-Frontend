import { create } from 'zustand';
import { AssetBalance } from '../types';
import { connectFreighter, FreighterNotInstalledError, FreighterCancelledError, FreighterNetworkMismatchError } from '@/lib/stellar/freighter';

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

interface WalletState {
  address: string | null;
  isConnected: boolean;
  connector: Connector;
  network: 'testnet' | 'public';
  balances: AssetBalance[];
  loading: boolean;
  error: string | null;
  connectError: ConnectError | null;
  connect: (connector?: Connector) => Promise<void>;
  disconnect: () => void;
  clearConnectError: () => void;
  setNetwork: (network: 'testnet' | 'public') => void;
  refreshBalances: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  connector: null,
  network: getNetwork(),
  balances: [],
  loading: false,
  error: null,

  connect: async (connector: Connector = 'freighter') => {
    try {
      set({ connectError: null });

      if (connector === 'freighter') {
        const address = await connectFreighter();
        if (address) {
          set({ address, isConnected: true, connector: 'freighter', connectError: null });
          get().refreshBalances();
        } else {
          throw new Error('Freighter connection failed');
        }
      } else if (connector === 'walletconnect') {
        const manual = typeof window !== 'undefined' ? window.prompt('Paste your Stellar public key (WalletConnect placeholder):') : null;
        if (manual) {
          set({ address: manual, isConnected: true, connector: 'walletconnect' });
          get().refreshBalances();
        } else {
          throw new Error('WalletConnect placeholder: no key provided');
        }
      } else {
        throw new Error('Unsupported connector');
      }
    } catch (error) {
      console.error('Failed to connect wallet', error);

      if (error instanceof FreighterNotInstalledError) {
        set({ connectError: { type: 'not_installed', message: error.message } });
      } else if (error instanceof FreighterCancelledError) {
        set({ connectError: { type: 'cancelled', message: error.message } });
      } else if (error instanceof FreighterNetworkMismatchError) {
        set({ connectError: { type: 'network_mismatch', message: error.message, expectedNetwork: error.expectedNetwork, freighterNetwork: error.freighterNetwork } });
      } else {
        set({ connectError: { type: 'generic', message: error instanceof Error ? error.message : 'An unexpected error occurred', raw: String(error) } });
      }

      throw error;
    }
  },

  disconnect: () => {
    set({ address: null, isConnected: false, connector: null, balances: [], loading: false, error: null, connectError: null });
  },

  clearConnectError: () => {
    set({ connectError: null });
  },

  setNetwork: (network: 'testnet' | 'public') => {
    set({ network });
    get().refreshBalances();
  },

  refreshBalances: async () => {
    const { address, network } = get();
    if (!address) return;

    set({ loading: true, error: null });

    const horizonUrl = NETWORK_URLS[network];

    try {
      const response = await fetch(`${horizonUrl}/accounts/${address}`);

      if (!response.ok) {
        if (response.status === 404) {
          set({ balances: [], loading: false });
          return;
        }
        throw new Error(`Horizon error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const balances: AssetBalance[] = data.balances.map((b: { asset_type: string; balance: string; asset_code?: string; asset_issuer?: string }) => {
        if (b.asset_type === 'native') {
          return { assetCode: 'XLM', balance: b.balance };
        }
        return {
          assetCode: b.asset_code!,
          balance: b.balance,
          assetIssuer: b.asset_issuer,
        };
      });

      set({ balances, loading: false, error: null });
    } catch (error) {
      console.error('Failed to refresh balances', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch balances',
      });
    }
  },
}));
