/**
 * Stellar Network Configuration Module
 *
 * Centralizes network configurations, Horizon REST endpoints, Soroban RPC URLs,
 * and network passphrases for Stellar networks: Testnet, Mainnet (Public), and Futurenet.
 */

export type StellarNetwork = 'testnet' | 'public' | 'futurenet';

export interface NetworkConfig {
  name: string;
  horizonUrl: string;
  rpcUrl: string;
  networkPassphrase: string;
}

export const STELLAR_NETWORKS: Record<StellarNetwork, NetworkConfig> = {
  testnet: {
    name: 'Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  },
  public: {
    name: 'Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    rpcUrl: 'https://mainnet.sorobanrpc.com',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
  },
  futurenet: {
    name: 'Futurenet',
    horizonUrl: 'https://horizon-futurenet.stellar.org',
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
  },
};

/**
 * Normalizes a raw network string identifier into a valid StellarNetwork.
 * Defaults to 'testnet' if missing or unrecognized.
 */
export function normalizeNetwork(net?: string | null): StellarNetwork {
  if (!net) return 'testnet';
  const lower = net.toLowerCase().trim();
  if (lower === 'futurenet') return 'futurenet';
  if (lower === 'public' || lower === 'mainnet') return 'public';
  return 'testnet';
}

/**
 * Returns the NetworkConfig for a given network name.
 */
export function getNetworkConfig(network: StellarNetwork | string): NetworkConfig {
  const normalized = normalizeNetwork(network);
  return STELLAR_NETWORKS[normalized];
}

/**
 * Returns the Horizon REST API URL for the specified network.
 */
export function getHorizonUrl(network: StellarNetwork | string): string {
  return getNetworkConfig(network).horizonUrl;
}

/**
 * Returns the Soroban RPC endpoint URL for the specified network.
 */
export function getRpcUrl(network: StellarNetwork | string): string {
  return getNetworkConfig(network).rpcUrl;
}

/**
 * Returns the network passphrase for the specified network.
 */
export function getNetworkPassphrase(network: StellarNetwork | string): string {
  return getNetworkConfig(network).networkPassphrase;
}
