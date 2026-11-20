import {
  useRateLimitStore,
  getRateLimitWindow,
  isRequestRateLimited,
  MAX_RETRY_AFTER_MS,
  parseRetryAfterSeconds,
  RATE_LIMIT_STORAGE_KEY,
} from '@/lib/store/rateLimitStore';

describe('rateLimitStore', () => {
  beforeEach(() => {
    useRateLimitStore.getState().clearRateLimit();
    localStorage.clear();
  });

  it('opens a window and counts down from the retry-after value', () => {
    useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);

    const state = useRateLimitStore.getState();
    expect(state.secondsRemaining).toBe(30);
    expect(state.endpoint).toBe('/api/payments');
    expect(state.limit).toBe(100);
    expect(state.rateLimitedUntil).toBeGreaterThan(Date.now());
  });

  it('never shortens an open window', () => {
    useRateLimitStore.getState().setRateLimited(60, '/api/payments');
    const until = useRateLimitStore.getState().rateLimitedUntil;

    useRateLimitStore.getState().setRateLimited(5, '/api/payments');

    expect(useRateLimitStore.getState().rateLimitedUntil).toBe(until);
  });

  it('ignores negative and non-finite retry-after durations', () => {
    useRateLimitStore.getState().setRateLimited(-5, '/api/payments');
    useRateLimitStore.getState().setRateLimited(Number.NaN, '/api/payments');

    expect(useRateLimitStore.getState().rateLimitedUntil).toBe(0);
    expect(isRequestRateLimited('/api/payments')).toBe(false);
  });

  it('clamps extreme retry-after durations to the maximum cooldown', () => {
    const now = Date.now();
    useRateLimitStore.getState().setRateLimited(9_999_999, '/api/payments');

    expect(useRateLimitStore.getState().rateLimitedUntil - now).toBeLessThanOrEqual(
      MAX_RETRY_AFTER_MS,
    );
    expect(useRateLimitStore.getState().secondsRemaining).toBe(900);
  });

  it('parses and bounds Retry-After header values', () => {
    expect(parseRetryAfterSeconds('-5')).toBeNull();
    expect(parseRetryAfterSeconds('NaN')).toBeNull();
    expect(parseRetryAfterSeconds('9999999')).toBe(900);
    expect(parseRetryAfterSeconds(new Date(Date.now() + 10_000).toUTCString()))
      .toBeLessThanOrEqual(10);
  });

  it('widens to a global window when a second endpoint is limited', () => {
    useRateLimitStore.getState().setRateLimited(30, '/api/payments');
    useRateLimitStore.getState().setRateLimited(45, '/api/settlements');

    expect(useRateLimitStore.getState().endpoint).toBeNull();
    expect(isRequestRateLimited('/api/anything')).toBe(true);
  });

  it('persists the window so a reload can restore it', () => {
    useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);

    const persisted = JSON.parse(localStorage.getItem(RATE_LIMIT_STORAGE_KEY) || '{}');
    expect(persisted.state.rateLimitedUntil).toBeGreaterThan(Date.now());
    expect(persisted.state.endpoint).toBe('/api/payments');
    // The derived countdown is not persisted — it is recomputed on rehydrate.
    expect(persisted.state.secondsRemaining).toBeUndefined();
  });

  describe('applyRemoteWindow', () => {
    it('adopts a window observed in another tab', () => {
      const rateLimitedUntil = Date.now() + 20_000;
      useRateLimitStore.getState().applyRemoteWindow({
        rateLimitedUntil,
        endpoint: '/api/payments',
        limit: 100,
      });

      const state = useRateLimitStore.getState();
      expect(state.rateLimitedUntil).toBe(rateLimitedUntil);
      expect(state.secondsRemaining).toBeGreaterThan(0);
      expect(state.endpoint).toBe('/api/payments');
    });

    it('clears local state when another tab reports the window is over', () => {
      useRateLimitStore.getState().setRateLimited(30, '/api/payments');
      useRateLimitStore.getState().applyRemoteWindow(null);

      expect(useRateLimitStore.getState().rateLimitedUntil).toBe(0);
      expect(useRateLimitStore.getState().secondsRemaining).toBe(0);
    });

    it('ignores an expired remote window', () => {
      useRateLimitStore.getState().applyRemoteWindow({
        rateLimitedUntil: Date.now() - 1000,
        endpoint: '/api/payments',
        limit: null,
      });

      expect(useRateLimitStore.getState().rateLimitedUntil).toBe(0);
    });

    it('clamps remote windows to the maximum cooldown', () => {
      useRateLimitStore.getState().applyRemoteWindow({
        rateLimitedUntil: Date.now() + MAX_RETRY_AFTER_MS * 10,
        endpoint: '/api/payments',
        limit: null,
      });

      expect(useRateLimitStore.getState().rateLimitedUntil - Date.now()).toBeLessThanOrEqual(
        MAX_RETRY_AFTER_MS,
      );
    });
  });

  describe('isRequestRateLimited', () => {
    it('is false when no window is open', () => {
      expect(isRequestRateLimited('/api/payments')).toBe(false);
      expect(getRateLimitWindow()).toBeNull();
    });

    it('gates only the limited endpoint when one is known', () => {
      useRateLimitStore.getState().setRateLimited(30, '/api/payments');

      expect(isRequestRateLimited('/api/payments')).toBe(true);
      expect(isRequestRateLimited('/api/payments?page=2')).toBe(true);
      expect(isRequestRateLimited('/api/rates')).toBe(false);
    });

    it('gates every request when the endpoint is unknown', () => {
      useRateLimitStore.getState().setRateLimited(30, null);

      expect(isRequestRateLimited('/api/payments')).toBe(true);
      expect(isRequestRateLimited('/api/rates')).toBe(true);
    });

    it('stops gating once the window has elapsed', () => {
      useRateLimitStore.setState({
        rateLimitedUntil: Date.now() - 1,
        secondsRemaining: 0,
        endpoint: '/api/payments',
        limit: null,
      });

      expect(isRequestRateLimited('/api/payments')).toBe(false);
    });
  });

  describe('tick', () => {
    it('clears the window once it elapses', () => {
      useRateLimitStore.setState({
        rateLimitedUntil: Date.now() - 1,
        secondsRemaining: 1,
        endpoint: '/api/payments',
        limit: null,
      });

      useRateLimitStore.getState().tick();

      expect(useRateLimitStore.getState().rateLimitedUntil).toBe(0);
      expect(useRateLimitStore.getState().endpoint).toBeNull();
    });

    it('is a no-op when no window is open', () => {
      useRateLimitStore.getState().tick();
      expect(useRateLimitStore.getState().secondsRemaining).toBe(0);
    });
  });
});
