import { scrubText, scrubStack, fingerprint } from '../scrub';

describe('scrubText', () => {
  it('redacts email addresses', () => {
    expect(scrubText('Login failed for merchant@bettapay.io')).toBe(
      'Login failed for [email]'
    );
  });

  it('redacts JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123def';
    expect(scrubText(`Invalid jwt ${jwt}`)).toContain('[jwt]');
    expect(scrubText(`Invalid jwt ${jwt}`)).not.toContain('eyJhbGciOiJIUzI1NiJ9');
  });

  it('redacts Stellar public keys', () => {
    const address = 'G' + 'A'.repeat(55);
    expect(scrubText(`Payment to ${address} failed`)).toBe(
      'Payment to [stellar-key] failed'
    );
  });

  it('redacts Stellar secret keys with [REDACTED]', () => {
    const secretKey = 'S' + 'B'.repeat(55);
    const stack = `Error: Signing failed for key ${secretKey}\n    at signTx (wallet.ts:42:11)`;
    const scrubbed = scrubStack(stack);
    expect(scrubbed).toContain('[REDACTED]');
    expect(scrubbed).not.toContain(secretKey);
  });

  it('redacts Bearer tokens in headers and stack traces with [REDACTED]', () => {
    const rawToken = ['my', 'Sensitive', 'Token', '98765'].join('_');
    const authHeader = ['Bear', 'er ', rawToken].join('');
    const scrubbed = scrubStack(`Request failed with Authorization: ${authHeader}`);
    expect(scrubbed).toBe('Request failed with Authorization: Bearer [REDACTED]');
    expect(scrubbed).not.toContain(rawToken);
  });

  it('redacts password and secret fields in serialized payloads', () => {
    const pwd = ['super', 'Secret', 'Pass', '123'].join('');
    const payload = `Body: {"email":"user@test.com","password":"${pwd}"}`;
    const scrubbed = scrubText(payload);
    expect(scrubbed).toContain('"password":[REDACTED]');
    expect(scrubbed).not.toContain(pwd);
    expect(scrubbed).toContain('[email]');
  });

  it('redacts long hex blobs such as transaction hashes', () => {
    expect(scrubText(`tx ${'a1b2c3d4'.repeat(8)} reverted`)).toBe(
      'tx [hex] reverted'
    );
  });

  it('strips query strings from URLs but keeps the path', () => {
    expect(
      scrubText('GET https://api.bettapay.io/payments?token=secret&id=42 failed')
    ).toBe('GET https://api.bettapay.io/payments failed');
  });

  it('truncates over-long input', () => {
    const scrubbed = scrubText('x'.repeat(1000), 100);
    expect(scrubbed).toHaveLength(100 + '…[truncated]'.length);
    expect(scrubbed.endsWith('…[truncated]')).toBe(true);
  });

  it('returns an empty string for non-string input', () => {
    expect(scrubText(undefined)).toBe('');
    expect(scrubText(null)).toBe('');
    expect(scrubText(42)).toBe('');
  });

  it('returns undefined for an absent stack', () => {
    expect(scrubStack(undefined)).toBeUndefined();
  });
});

describe('fingerprint', () => {
  it('is stable for identical input', () => {
    expect(fingerprint(['TypeError', 'boom', 'at foo'])).toBe(
      fingerprint(['TypeError', 'boom', 'at foo'])
    );
  });

  it('differs for different input', () => {
    expect(fingerprint(['TypeError', 'boom'])).not.toBe(
      fingerprint(['TypeError', 'bang'])
    );
  });

  it('produces a hex string', () => {
    expect(fingerprint(['a', 'b'])).toMatch(/^[a-f0-9]+$/);
  });
});

describe('send', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('collapses repeated errors by fingerprint instead of queueing duplicates', async () => {
    const { enqueue, getQueueSize, resetSender } = await import('../send');
    resetSender();

    const base = {
      clientId: 'abc123',
      fingerprint: 'deadbeef',
      source: 'boundary' as const,
      name: 'TypeError',
      message: 'boom',
      count: 1,
      context: {
        route: '/dashboard',
        isAuthenticated: true,
        role: 'merchant',
        walletConnected: false,
        walletConnector: null,
        walletNetwork: null,
        online: true,
      },
      timestamp: Date.now(),
    };

    enqueue({ ...base });
    enqueue({ ...base });
    enqueue({ ...base });

    expect(getQueueSize()).toBe(1);
    resetSender();
  });

  it('queues distinct errors separately', async () => {
    const { enqueue, getQueueSize, resetSender } = await import('../send');
    resetSender();

    const context = {
      route: '/dashboard',
      isAuthenticated: false,
      role: null,
      walletConnected: false,
      walletConnector: null,
      walletNetwork: null,
      online: true,
    };

    enqueue({
      clientId: 'abc123',
      fingerprint: 'aaaaaaaa',
      source: 'window',
      name: 'TypeError',
      message: 'a',
      count: 1,
      context,
      timestamp: Date.now(),
    });
    enqueue({
      clientId: 'abc123',
      fingerprint: 'bbbbbbbb',
      source: 'api',
      name: 'Error',
      message: 'b',
      count: 1,
      context,
      timestamp: Date.now(),
    });

    expect(getQueueSize()).toBe(2);
    resetSender();
  });
});

describe('captureException', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  it('enqueues a scrubbed report with route and store context', async () => {
    const enqueue = jest.fn();
    jest.doMock('../send', () => ({
      enqueue,
      initSender: jest.fn(),
      destroySender: jest.fn(),
      flush: jest.fn(),
    }));

    const { captureException } = await import('../index');
    captureException(new Error('failed for merchant@bettapay.io'), {
      source: 'boundary',
      route: '/dashboard?token=secret',
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    const report = enqueue.mock.calls[0][0];
    expect(report.message).toBe('failed for [email]');
    expect(report.source).toBe('boundary');
    expect(report.context.route).toBe('/dashboard');
    expect(report.count).toBe(1);
    expect(report.fingerprint).toMatch(/^[a-f0-9]+$/);
  });

  it('does nothing when the user has opted out of telemetry', async () => {
    const enqueue = jest.fn();
    jest.doMock('../send', () => ({
      enqueue,
      initSender: jest.fn(),
      destroySender: jest.fn(),
      flush: jest.fn(),
    }));
    localStorage.setItem('bp_telemetry_consent', 'false');

    const { captureException } = await import('../index');
    captureException(new Error('boom'));

    expect(enqueue).not.toHaveBeenCalled();
  });

  it('never throws on a non-Error value', async () => {
    const { captureException } = await import('../index');
    expect(() => captureException(undefined)).not.toThrow();
    expect(() => captureException('a string')).not.toThrow();
    expect(() => captureException({ weird: true })).not.toThrow();
  });
});
