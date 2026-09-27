import { envSchema, validateEnv, getRawEnv, SITE_URL, STELLAR_NETWORK, WALLETCONNECT_PROJECT_ID } from '../config';

describe('lib/config environment variable validation', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('exports valid default configuration values on module load', () => {
    expect(SITE_URL).toBeDefined();
    expect(STELLAR_NETWORK).toBe('testnet');
    expect(typeof WALLETCONNECT_PROJECT_ID).toBe('string');
  });

  it('validates and parses a valid environment object with defaults', () => {
    const parsed = validateEnv({});
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe('https://betta.pay');
    expect(parsed.NEXT_PUBLIC_STELLAR_NETWORK).toBe('testnet');
    expect(parsed.NEXT_PUBLIC_STELLAR_HORIZON_URL).toBe('https://horizon-testnet.stellar.org');
    expect(parsed.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID).toBe('CBGBGKJSUY7XYB6HWW4CVAU6MW2KD25FSF45E5KCP53TKUK374MBZNFB');
  });

  it('correctly parses custom environment variables', () => {
    const customInput = {
      NEXT_PUBLIC_SITE_URL: 'https://custom.betta.pay',
      NEXT_PUBLIC_STELLAR_NETWORK: 'mainnet',
      NEXT_PUBLIC_STELLAR_HORIZON_URL: 'https://horizon.stellar.org',
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: '  abc123projectid  ',
    };
    const parsed = validateEnv(customInput);
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe('https://custom.betta.pay');
    expect(parsed.NEXT_PUBLIC_STELLAR_NETWORK).toBe('mainnet');
    expect(parsed.NEXT_PUBLIC_STELLAR_HORIZON_URL).toBe('https://horizon.stellar.org');
    expect(parsed.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID).toBe('abc123projectid');
  });

  it('throws a descriptive error and logs missing/invalid keys when validation fails', () => {
    const invalidInput = {
      NEXT_PUBLIC_STELLAR_NETWORK: 'invalid_network_name',
    };

    expect(() => validateEnv(invalidInput)).toThrow(/\[Config\] ❌ Invalid or missing environment variables/);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing/Invalid keys: NEXT_PUBLIC_STELLAR_NETWORK')
    );
  });

  it('getRawEnv returns an object containing process.env keys', () => {
    const raw = getRawEnv();
    expect(raw).toHaveProperty('NEXT_PUBLIC_SITE_URL');
    expect(raw).toHaveProperty('NEXT_PUBLIC_STELLAR_NETWORK');
  });
});
