import {
  getStellarExplorerTxUrl,
  getStellarExplorerAccountUrl,
  normalizeStellarNetwork,
  resolveExplorerNetwork,
} from '@/lib/utils/explorer';

describe('explorer URL helpers', () => {
  describe('normalizeStellarNetwork', () => {
    it('maps testnet variants to testnet', () => {
      expect(normalizeStellarNetwork('testnet')).toBe('testnet');
      expect(normalizeStellarNetwork('TESTNET')).toBe('testnet');
      expect(normalizeStellarNetwork('  testnet  ')).toBe('testnet');
      expect(normalizeStellarNetwork('')).toBe('testnet');
      expect(normalizeStellarNetwork(null)).toBe('testnet');
      expect(normalizeStellarNetwork(undefined)).toBe('testnet');
      expect(normalizeStellarNetwork('unknown')).toBe('testnet');
    });

    it('maps public/mainnet variants to public', () => {
      expect(normalizeStellarNetwork('public')).toBe('public');
      expect(normalizeStellarNetwork('PUBLIC')).toBe('public');
      expect(normalizeStellarNetwork('mainnet')).toBe('public');
      expect(normalizeStellarNetwork('MAINNET')).toBe('public');
      expect(normalizeStellarNetwork('pubnet')).toBe('public');
      expect(normalizeStellarNetwork('  public  ')).toBe('public');
      expect(normalizeStellarNetwork('  mainnet  ')).toBe('public');
    });

    it('maps futurenet variants to futurenet', () => {
      expect(normalizeStellarNetwork('futurenet')).toBe('futurenet');
      expect(normalizeStellarNetwork('  FUTURENET  ')).toBe('futurenet');
    });
  });

  describe('getStellarExplorerTxUrl', () => {
    const hash = 'abc123hash00000000000000000000000000000000000000000000000000000000';

    it('builds testnet explorer URL when network is testnet', () => {
      expect(getStellarExplorerTxUrl(hash, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/tx/${hash}`,
      );
    });

    it('builds mainnet explorer URL when network is public', () => {
      expect(getStellarExplorerTxUrl(hash, 'public')).toBe(
        `https://stellar.expert/explorer/public/tx/${hash}`,
      );
    });

    it('builds futurenet explorer URL when network is futurenet', () => {
      expect(getStellarExplorerTxUrl(hash, 'futurenet')).toBe(
        `https://stellar.expert/explorer/futurenet/tx/${hash}`,
      );
    });

    it('treats mainnet alias as public via normalize', () => {
      expect(getStellarExplorerTxUrl(hash, 'mainnet')).toBe(
        `https://stellar.expert/explorer/public/tx/${hash}`,
      );
      expect(getStellarExplorerTxUrl(hash, 'MAINNET')).toBe(
        `https://stellar.expert/explorer/public/tx/${hash}`,
      );
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(getStellarExplorerTxUrl(hash, '  PUBLIC  ')).toBe(
        `https://stellar.expert/explorer/public/tx/${hash}`,
      );
      expect(getStellarExplorerTxUrl(hash, '  TeStNeT  ')).toBe(
        `https://stellar.expert/explorer/testnet/tx/${hash}`,
      );
    });

    it('falls back to build-time network when network is omitted', () => {
      const fallback = resolveExplorerNetwork();
      expect(getStellarExplorerTxUrl(hash)).toBe(
        `https://stellar.expert/explorer/${fallback}/tx/${hash}`,
      );
      expect(getStellarExplorerTxUrl(hash, null)).toBe(
        `https://stellar.expert/explorer/${fallback}/tx/${hash}`,
      );
      expect(getStellarExplorerTxUrl(hash, undefined)).toBe(
        `https://stellar.expert/explorer/${fallback}/tx/${hash}`,
      );
    });

    it('encodes tx hash', () => {
      const special = 'a/b c?d#e';
      expect(getStellarExplorerTxUrl(special, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/tx/${encodeURIComponent(special)}`,
      );
    });
  });

  describe('getStellarExplorerAccountUrl', () => {
    const addr = 'GBX1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCD';

    it('builds testnet account URL', () => {
      expect(getStellarExplorerAccountUrl(addr, 'testnet')).toBe(
        `https://stellar.expert/explorer/testnet/account/${addr}`,
      );
    });

    it('builds public account URL', () => {
      expect(getStellarExplorerAccountUrl(addr, 'public')).toBe(
        `https://stellar.expert/explorer/public/account/${addr}`,
      );
    });

    it('builds futurenet account URL', () => {
      expect(getStellarExplorerAccountUrl(addr, 'futurenet')).toBe(
        `https://stellar.expert/explorer/futurenet/account/${addr}`,
      );
    });

    it('treats mainnet as public', () => {
      expect(getStellarExplorerAccountUrl(addr, 'mainnet')).toBe(
        `https://stellar.expert/explorer/public/account/${addr}`,
      );
    });

    it('falls back to build-time network when omitted', () => {
      const fallback = resolveExplorerNetwork();
      expect(getStellarExplorerAccountUrl(addr)).toBe(
        `https://stellar.expert/explorer/${fallback}/account/${addr}`,
      );
    });
  });
});
