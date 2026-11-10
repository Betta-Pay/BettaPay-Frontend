import {
  djb2Hash,
  shouldSample,
  getClientId,
  getConfiguredSampleRate,
  DEFAULT_RUM_SAMPLE_RATE,
} from '../client';

describe('djb2Hash', () => {
  it('returns a non-negative integer', () => {
    const hash = djb2Hash('test-string');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(hash)).toBe(true);
  });

  it('is deterministic for the same input', () => {
    expect(djb2Hash('hello')).toBe(djb2Hash('hello'));
  });

  it('produces different values for different inputs', () => {
    expect(djb2Hash('hello')).not.toBe(djb2Hash('world'));
  });

  it('handles empty string', () => {
    const hash = djb2Hash('');
    expect(hash).toBeGreaterThanOrEqual(0);
  });
});

describe('shouldSample', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns true when sampleRate is 1', () => {
    expect(shouldSample('client1', 1)).toBe(true);
  });

  it('returns false when sampleRate is 0', () => {
    expect(shouldSample('client1', 0)).toBe(false);
  });

  it('returns false when clientId is empty', () => {
    expect(shouldSample('', 1)).toBe(false);
  });

  it('is deterministic for the same client in the same window', () => {
    const result1 = shouldSample('consistent-client', 0.5);
    const result2 = shouldSample('consistent-client', 0.5);
    expect(result1).toBe(result2);
  });

  it('returns false when sampleRate is negative', () => {
    expect(shouldSample('client1', -0.5)).toBe(false);
  });

  it('reads NEXT_PUBLIC_RUM_SAMPLE_RATE and clamps values to [0, 1]', () => {
    const original = process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
    try {
      delete process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
      expect(getConfiguredSampleRate()).toBe(DEFAULT_RUM_SAMPLE_RATE);

      process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = '0.5';
      expect(getConfiguredSampleRate()).toBe(0.5);

      process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = '2.5';
      expect(getConfiguredSampleRate()).toBe(1);

      process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = '-1';
      expect(getConfiguredSampleRate()).toBe(0);

      process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = 'invalid';
      expect(getConfiguredSampleRate()).toBe(DEFAULT_RUM_SAMPLE_RATE);
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
      } else {
        process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = original;
      }
    }
  });

  it('samples approximately 50% of sessions when sampleRate is 0.5', () => {
    const original = process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
    process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = '0.5';
    try {
      const total = 1000;
      let sampled = 0;
      for (let i = 0; i < total; i++) {
        if (shouldSample(`session-client-${i}`)) {
          sampled++;
        }
      }
      expect(sampled).toBeGreaterThan(400);
      expect(sampled).toBeLessThan(600);
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE;
      } else {
        process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE = original;
      }
    }
  });
});

describe('clientId', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('generates and persists a client ID in sessionStorage', () => {
    const id1 = getClientId();
    const id2 = getClientId();
    expect(id1).toBeTruthy();
    expect(id2).toBe(id1);
  });
});
