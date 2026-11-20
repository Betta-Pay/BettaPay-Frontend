import { STELLAR_NETWORK } from './constants';

export type StellarNetwork = 'testnet' | 'public' | 'futurenet';

/** Normalizes any Stellar network string (env, store, user input) to the explorer's vocabulary. */
export function normalizeStellarNetwork(raw?: string | null): StellarNetwork {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'public' || v === 'pubnet' || v === 'mainnet') return 'public';
  if (v === 'futurenet') return 'futurenet';
  return 'testnet';
}

/** Build-time fallback when the caller has no runtime network (SSR / disconnected). */
export function resolveExplorerNetwork(): StellarNetwork {
  return normalizeStellarNetwork(STELLAR_NETWORK);
}

export function getStellarExplorerTxUrl(txHash: string, network?: StellarNetwork | string | null): string {
  const n = normalizeStellarNetwork(network ?? resolveExplorerNetwork());
  return `https://stellar.expert/explorer/${n}/tx/${encodeURIComponent(txHash)}`;
}

export function getStellarExplorerAccountUrl(address: string, network?: StellarNetwork | string | null): string {
  const n = normalizeStellarNetwork(network ?? resolveExplorerNetwork());
  return `https://stellar.expert/explorer/${n}/account/${encodeURIComponent(address)}`;
}
