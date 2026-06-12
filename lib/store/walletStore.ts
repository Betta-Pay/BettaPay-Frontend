import { create } from 'zustand';
import { AssetBalance } from '../types';
import { isAllowed, setAllowed, requestAccess } from '@stellar/freighter-api';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  network: 'mainnet' | 'testnet';
  balances: AssetBalance[];
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  network: (process.env.NEXT_PUBLIC_STELLAR_NETWORK as 'mainnet' | 'testnet') || 'testnet',
  balances: [],
  connect: async () => {
    try {
      let allowedResp = await isAllowed();
      if (!allowedResp.isAllowed) {
        await setAllowed();
        allowedResp = await isAllowed();
      }
      if (allowedResp.isAllowed) {
        const accessResp = await requestAccess();
        if (!accessResp.error && accessResp.address) {
          set({ address: accessResp.address, isConnected: true });
          get().refreshBalances();
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet', error);
      throw error;
    }
  },
  disconnect: () => {
    set({ address: null, isConnected: false, balances: [] });
  },
  refreshBalances: async () => {
    const { address } = get();
    if (!address) return;
    
    // In a real app, this would query horizon. For now we use mock data.
    set({
      balances: [
        { assetCode: 'USDC', balance: '14500.00', usdEquivalent: 14500.00 },
        { assetCode: 'XLM', balance: '250.50', usdEquivalent: 25.05 },
      ]
    });
  }
}));
