import { renderHook, act } from '@testing-library/react';
import {
  DEFAULT_RETRY_AFTER_SECONDS,
  parseRetryAfterHeader,
  useRateLimitCountdown,
} from '../useRateLimitCountdown';
import { useRateLimitStore } from '../../store/rateLimitStore';

describe('parseRetryAfterHeader (#908)', () => {
  it('parses integer delta-seconds strings accurately', () => {
    expect(parseRetryAfterHeader('15')).toBe(15);
    expect(parseRetryAfterHeader('  42  ')).toBe(42);
    expect(parseRetryAfterHeader(30)).toBe(30);
  });

  it('parses HTTP-date format relative to current time', () => {
    const nowMs = Date.parse('Wed, 21 Oct 2026 07:27:35 GMT');
    const retryAfterDate = 'Wed, 21 Oct 2026 07:28:00 GMT';
    expect(parseRetryAfterHeader(retryAfterDate, nowMs)).toBe(25);
  });

  it('returns 0 when an HTTP-date Retry-After header is already in the past', () => {
    const nowMs = Date.parse('Wed, 21 Oct 2026 07:29:00 GMT');
    const retryAfterDate = 'Wed, 21 Oct 2026 07:28:00 GMT';
    expect(parseRetryAfterHeader(retryAfterDate, nowMs)).toBe(0);
  });

  it('falls back to DEFAULT_RETRY_AFTER_SECONDS when header is missing or malformed', () => {
    expect(parseRetryAfterHeader(undefined)).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterHeader(null)).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterHeader('')).toBe(DEFAULT_RETRY_AFTER_SECONDS);
    expect(parseRetryAfterHeader('invalid-header')).toBe(DEFAULT_RETRY_AFTER_SECONDS);
  });
});

describe('useRateLimitCountdown (#908)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    act(() => {
      useRateLimitStore.getState().clearRateLimit();
    });
  });

  afterEach(() => {
    act(() => {
      useRateLimitStore.getState().clearRateLimit();
    });
    jest.useRealTimers();
  });

  it('initializes the rate-limit countdown from a delta-seconds Retry-After header', () => {
    const { result } = renderHook(() => useRateLimitCountdown('15', '/api/payments'));

    expect(result.current.secondsRemaining).toBe(15);
    expect(result.current.isRateLimited).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.secondsRemaining).toBe(10);
  });

  it('initializes the countdown from an HTTP-date Retry-After header', () => {
    const now = new Date('2026-10-21T07:27:40.000Z');
    jest.setSystemTime(now);

    const { result } = renderHook(() =>
      useRateLimitCountdown('Wed, 21 Oct 2026 07:28:00 GMT', '/api/settlements'),
    );

    expect(result.current.secondsRemaining).toBe(20);
    expect(result.current.isRateLimited).toBe(true);
  });
});
