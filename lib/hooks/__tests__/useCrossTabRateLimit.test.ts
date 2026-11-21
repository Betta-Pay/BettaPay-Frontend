import { renderHook } from '@testing-library/react';
import { useCrossTabRateLimit } from '../useCrossTabRateLimit';
import { useRateLimitStore } from '@/lib/store/rateLimitStore';

type ChannelListener = (event: MessageEvent) => void;

class MockBroadcastChannel {
  static latest: MockBroadcastChannel | null = null;

  name: string;
  closed = false;
  listeners = new Set<ChannelListener>();
  postMessage = jest.fn();
  close = jest.fn(() => {
    this.closed = true;
    this.listeners.clear();
  });

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.latest = this;
  }

  addEventListener(type: string, listener: ChannelListener) {
    if (type === 'message') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: ChannelListener) {
    if (type === 'message') this.listeners.delete(listener);
  }

  emit(data: unknown) {
    const event = { data } as MessageEvent;
    this.listeners.forEach((listener) => listener(event));
  }
}

describe('useCrossTabRateLimit', () => {
  const originalBroadcastChannel = global.BroadcastChannel;

  beforeEach(async () => {
    MockBroadcastChannel.latest = null;
    global.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
    localStorage.clear();
    useRateLimitStore.getState().clearRateLimit();
    await useRateLimitStore.persist.rehydrate();
    useRateLimitStore.getState().clearRateLimit();
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    useRateLimitStore.getState().clearRateLimit();
    localStorage.clear();
  });

  it('applies an incoming rate-limit window without echoing it', () => {
    renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.latest;
    expect(channel).not.toBeNull();
    expect(channel?.name).toBe('bettapay-rate-limit-sync');

    const rateLimitedUntil = Date.now() + 20_000;
    channel?.emit({
      type: 'RATE_LIMIT_SET',
      window: {
        rateLimitedUntil,
        endpoint: '/api/payments',
        limit: 100,
      },
    });

    expect(useRateLimitStore.getState()).toMatchObject({
      rateLimitedUntil,
      endpoint: '/api/payments',
      limit: 100,
    });
    expect(channel?.postMessage).not.toHaveBeenCalled();
  });

  it('clears the local window when another tab broadcasts RATE_LIMIT_CLEAR', () => {
    useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);
    renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.latest;
    channel?.postMessage.mockClear();

    channel?.emit({ type: 'RATE_LIMIT_CLEAR' });

    expect(useRateLimitStore.getState()).toMatchObject({
      rateLimitedUntil: 0,
      secondsRemaining: 0,
      endpoint: null,
      limit: null,
    });
    expect(channel?.postMessage).not.toHaveBeenCalled();
  });

  it('broadcasts a newly opened local window to other tabs', () => {
    renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.latest;

    useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);

    expect(channel?.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RATE_LIMIT_SET',
        window: expect.objectContaining({
          endpoint: '/api/payments',
          limit: 100,
        }),
      }),
    );
    const message = channel?.postMessage.mock.calls[0][0] as {
      window: { rateLimitedUntil: number };
    };
    expect(message.window.rateLimitedUntil).toBeGreaterThan(Date.now());
  });

  it('broadcasts RATE_LIMIT_CLEAR when the local window ends', () => {
    renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.latest;

    useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);
    channel?.postMessage.mockClear();
    useRateLimitStore.getState().clearRateLimit();

    expect(channel?.postMessage).toHaveBeenCalledWith({ type: 'RATE_LIMIT_CLEAR' });
  });

  it('closes the channel on unmount', () => {
    const { unmount } = renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.latest;
    expect(channel?.close).not.toHaveBeenCalled();

    expect(() => unmount()).not.toThrow();

    expect(channel?.close).toHaveBeenCalledTimes(1);
    expect(channel?.closed).toBe(true);
  });

  it('unmounts cleanly when BroadcastChannel is unavailable', () => {
    global.BroadcastChannel = class {
      constructor() {
        throw new Error('BroadcastChannel is not supported');
      }
    } as unknown as typeof BroadcastChannel;

    const { unmount } = renderHook(() => useCrossTabRateLimit());

    expect(MockBroadcastChannel.latest).toBeNull();
    expect(() => unmount()).not.toThrow();
  });
});
