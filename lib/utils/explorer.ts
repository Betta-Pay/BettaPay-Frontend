import { STELLAR_NETWORK } from './constants';

export function getStellarExplorerTxUrl(txHash: string): string {
  const network = STELLAR_NETWORK.toLowerCase() === 'public' || STELLAR_NETWORK.toLowerCase() === 'mainnet' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}
