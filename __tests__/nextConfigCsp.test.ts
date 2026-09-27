/**
 * Content-Security-Policy emitted by next.config.js (issue #777).
 */

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function loadCsp(env: Record<string, string | undefined> = {}): Promise<Map<string, string[]>> {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    let config: { headers: () => Promise<HeaderRule[]> } | undefined;
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      config = require('../next.config.js');
    });
    const rules = await config!.headers();
    const value = rules[0].headers.find((h) => h.key === 'Content-Security-Policy')!.value;
    return new Map(
      value.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
        const [name, ...sources] = d.split(/\s+/);
        return [name, sources] as [string, string[]];
      }),
    );
  } finally {
    process.env = saved;
  }
}

describe('next.config.js Content-Security-Policy', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('forbids framing the app to prevent clickjacking', async () => {
    const csp = await loadCsp();
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('never allows a bare https:/wss: wildcard', async () => {
    const csp = await loadCsp();
    for (const [, sources] of csp) {
      expect(sources).not.toContain('https:');
      expect(sources).not.toContain('wss:');
    }
  });

  it('restricts script-src and blocks plugins', async () => {
    const csp = await loadCsp();
    expect(csp.get('script-src')).toEqual(["'self'", "'unsafe-inline'", 'https://accounts.google.com']);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
  });

  it('allows the configured Horizon, Soroban and API origins in connect-src', async () => {
    const csp = await loadCsp({
      NEXT_PUBLIC_API_URL: 'https://api.bettapay.io/v1',
      NEXT_PUBLIC_STELLAR_HORIZON_URL: 'https://horizon.example.org/',
      NEXT_PUBLIC_SOROBAN_RPC_URL: 'https://rpc.example.org/soroban',
    });
    const connect = csp.get('connect-src')!;
    expect(connect).toEqual(
      expect.arrayContaining([
        "'self'",
        'https://api.bettapay.io',
        'https://horizon.example.org',
        'https://rpc.example.org',
        'https://horizon-testnet.stellar.org',
        'https://soroban-testnet.stellar.org',
        'wss://relay.walletconnect.com',
      ]),
    );
  });

  it('ignores invalid URLs in env vars', async () => {
    const csp = await loadCsp({ NEXT_PUBLIC_SOROBAN_RPC_URL: 'not a url' });
    expect(csp.get('connect-src')).not.toContain('not');
  });
});
