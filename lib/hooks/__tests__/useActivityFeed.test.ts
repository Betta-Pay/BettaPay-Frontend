import { renderHook, act } from '@testing-library/react';
import {
  computeSseBackoffDelay,
  useActivityFeed,
  SSE_BACKOFF_BASE_MS,
  SSE_BACKOFF_MAX_MS,
} from '../useActivityFeed';

jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { data: [], nextCursor: null } }),
  },
}));

jest.mock('@/lib/config/api', () => ({
  getApiBaseUrl: () => 'https://api.bettapay.test',
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'merchant-123' },
    isLoggedIn: true,
  }),
}));

class MockEventSource {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  static instances: MockEventSource[] = [];

  readonly url: string;
  readyState = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((ev: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener() {}

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  fail() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }
}

describe('computeSseBackoffDelay (#906)', () => {
  it('computes exponential backoff (1s, 2s, 4s, 8s, 16s, capped at 30s) when jitter is 0', () => {
    const zeroRandom = () => 0;
    expect(computeSseBackoffDelay(0, { random: zeroRandom })).toBe(1_000);
    expect(computeSseBackoffDelay(1, { random: zeroRandom })).toBe(2_000);
    expect(computeSseBackoffDelay(2, { random: zeroRandom })).toBe(4_000);
    expect(computeSseBackoffDelay(3, { random: zeroRandom })).toBe(8_000);
    expect(computeSseBackoffDelay(4, { random: zeroRandom })).toBe(16_000);
    expect(computeSseBackoffDelay(5, { random: zeroRandom })).toBe(SSE_BACKOFF_MAX_MS);
    expect(computeSseBackoffDelay(10, { random: zeroRandom })).toBe(SSE_BACKOFF_MAX_MS);
  });

  it('adds positive randomized jitter bounded by maxDelayMs', () => {
    const delay = computeSseBackoffDelay(1, {
      baseDelayMs: SSE_BACKOFF_BASE_MS,
      jitterRatio: 0.2,
      random: () => 0.5,
    });
    // 2000ms + (2000 * 0.2 * 0.5) = 2200ms
    expect(delay).toBe(2_200);
  });
});

describe('useActivityFeed SSE exponential backoff (#906)', () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0); // deterministic 0 jitter in timer assertions
    MockEventSource.instances = [];
    global.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('spaces out SSE reconnection attempts exponentially (1s, 2s, 4s) on errors', () => {
    const { unmount } = renderHook(() => useActivityFeed(10, 'all'));

    expect(MockEventSource.instances).toHaveLength(1);

    // 1st failure -> should wait 1000ms before reconnecting
    act(() => {
      MockEventSource.instances[0].fail();
    });
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(999);
    });
    expect(MockEventSource.instances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(MockEventSource.instances).toHaveLength(2);

    // 2nd failure -> should wait 2000ms before reconnecting
    act(() => {
      MockEventSource.instances[1].fail();
    });
    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(MockEventSource.instances).toHaveLength(2);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(MockEventSource.instances).toHaveLength(3);

    // 3rd failure -> should wait 4000ms before reconnecting
    act(() => {
      MockEventSource.instances[2].fail();
    });
    act(() => {
      jest.advanceTimersByTime(3999);
    });
    expect(MockEventSource.instances).toHaveLength(3);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(MockEventSource.instances).toHaveLength(4);

    unmount();
  });
});
