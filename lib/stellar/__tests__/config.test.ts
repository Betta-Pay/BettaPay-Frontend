import {
  STELLAR_NETWORKS,
  normalizeNetwork,
  getNetworkConfig,
  getHorizonUrl,
  getRpcUrl,
  getNetworkPassphrase,
} from '../config';

describe('STELLAR_NETWORKS', () => {
  it('defines testnet config with correct Horizon URL', () => {
    expect(STELLAR_NETWORKS.testnet.horizonUrl).toBe('https://horizon-testnet.stellar.org');
  });

  it('defines testnet Soroban RPC URL', () => {
    expect(STELLAR_NETWORKS.testnet.rpcUrl).toBe('https://soroban-testnet.stellar.org');
  });

  it('defines testnet network passphrase', () => {
    expect(STELLAR_NETWORKS.testnet.networkPassphrase).toBe('Test SDF Network ; September 2015');
  });

  it('defines public (mainnet) Horizon URL', () => {
    expect(STELLAR_NETWORKS.public.horizonUrl).toBe('https://horizon.stellar.org');
  });

  it('defines public Soroban RPC URL', () => {
    expect(STELLAR_NETWORKS.public.rpcUrl).toBe('https://mainnet.sorobanrpc.com');
  });

  it('defines public network passphrase', () => {
    expect(STELLAR_NETWORKS.public.networkPassphrase).toBe('Public Global Stellar Network ; September 2015');
  });

  it('defines futurenet Horizon URL', () => {
    expect(STELLAR_NETWORKS.futurenet.horizonUrl).toBe('https://horizon-futurenet.stellar.org');
  });

  it('defines futurenet Soroban RPC URL', () => {
    expect(STELLAR_NETWORKS.futurenet.rpcUrl).toBe('https://rpc-futurenet.stellar.org');
  });

  it('defines futurenet network passphrase', () => {
    expect(STELLAR_NETWORKS.futurenet.networkPassphrase).toBe('Test SDF Future Network ; October 2022');
  });
});

describe('normalizeNetwork', () => {
  it('returns testnet by default when input is undefined', () => {
    expect(normalizeNetwork(undefined)).toBe('testnet');
  });

  it('returns testnet by default when input is null', () => {
    expect(normalizeNetwork(null)).toBe('testnet');
  });

  it('returns testnet by default for empty string', () => {
    expect(normalizeNetwork('')).toBe('testnet');
  });

  it('returns testnet for unknown values', () => {
    expect(normalizeNetwork('staging')).toBe('testnet');
  });

  it('normalizes "testnet" to testnet', () => {
    expect(normalizeNetwork('testnet')).toBe('testnet');
  });

  it('normalizes "TESTNET" (uppercase) to testnet', () => {
    expect(normalizeNetwork('TESTNET')).toBe('testnet');
  });

  it('normalizes "public" to public', () => {
    expect(normalizeNetwork('public')).toBe('public');
  });

  it('normalizes "mainnet" to public', () => {
    expect(normalizeNetwork('mainnet')).toBe('public');
  });

  it('normalizes "PUBLIC" (uppercase) to public', () => {
    expect(normalizeNetwork('PUBLIC')).toBe('public');
  });

  it('normalizes "futurenet" to futurenet', () => {
    expect(normalizeNetwork('futurenet')).toBe('futurenet');
  });

  it('normalizes "FUTURENET" (uppercase) to futurenet', () => {
    expect(normalizeNetwork('FUTURENET')).toBe('futurenet');
  });
});

describe('getNetworkConfig', () => {
  it('returns futurenet config for futurenet', () => {
    const config = getNetworkConfig('futurenet');
    expect(config).toEqual(STELLAR_NETWORKS.futurenet);
  });

  it('returns public config for public', () => {
    const config = getNetworkConfig('public');
    expect(config).toEqual(STELLAR_NETWORKS.public);
  });

  it('returns testnet config for testnet', () => {
    const config = getNetworkConfig('testnet');
    expect(config).toEqual(STELLAR_NETWORKS.testnet);
  });

  it('returns testnet config by default for unknown input', () => {
    const config = getNetworkConfig('unknown');
    expect(config).toEqual(STELLAR_NETWORKS.testnet);
  });
});

describe('getHorizonUrl', () => {
  it('returns the correct Horizon URL for futurenet', () => {
    expect(getHorizonUrl('futurenet')).toBe('https://horizon-futurenet.stellar.org');
  });

  it('returns the correct Horizon URL for testnet', () => {
    expect(getHorizonUrl('testnet')).toBe('https://horizon-testnet.stellar.org');
  });

  it('returns the correct Horizon URL for public', () => {
    expect(getHorizonUrl('public')).toBe('https://horizon.stellar.org');
  });
});

describe('getRpcUrl', () => {
  it('returns the correct RPC URL for futurenet', () => {
    expect(getRpcUrl('futurenet')).toBe('https://rpc-futurenet.stellar.org');
  });

  it('returns the correct RPC URL for testnet', () => {
    expect(getRpcUrl('testnet')).toBe('https://soroban-testnet.stellar.org');
  });

  it('returns the correct RPC URL for public', () => {
    expect(getRpcUrl('public')).toBe('https://mainnet.sorobanrpc.com');
  });
});

describe('getNetworkPassphrase', () => {
  it('returns the correct passphrase for futurenet', () => {
    expect(getNetworkPassphrase('futurenet')).toBe('Test SDF Future Network ; October 2022');
  });

  it('returns the correct passphrase for testnet', () => {
    expect(getNetworkPassphrase('testnet')).toBe('Test SDF Network ; September 2015');
  });

  it('returns the correct passphrase for public', () => {
    expect(getNetworkPassphrase('public')).toBe('Public Global Stellar Network ; September 2015');
  });
});
