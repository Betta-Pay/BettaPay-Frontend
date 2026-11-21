import { act, renderHook } from '@testing-library/react';
import { useCrossTabRateLimit } from '../useCrossTabRateLimit';
import { useRateLimitStore } from '@/lib/store/rateLimitStore';

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];

  readonly name: string;
  readonly postMessage = jest.fn();
  readonly close = jest.fn();
  readonly addEventListener = jest.fn(
    (_type: string, listener: EventListenerOrEventListenerObject) => {
      this.listener = listener;
    },
  );
  readonly removeEventListener = jest.fn();
  private listener: EventListenerOrEventListenerObject | null = null;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  dispatchMessage(data: unknown) {
    const event = { data } as MessageEvent;
    if (typeof this.listener === 'function') this.listener(event);
    else this.listener?.handleEvent(event);
  }
}

describe('useCrossTabRateLimit', () => {
  const originalBroadcastChannel = global.BroadcastChannel;

  beforeEach(() => {
    MockBroadcastChannel.instances = [];
    global.BroadcastChannel =
      MockBroadcastChannel as unknown as typeof BroadcastChannel;
    useRateLimitStore.getState().clearRateLimit();
    localStorage.clear();
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
  });

  it('applies an incoming rate-limit window without broadcasting it back', () => {
    renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.instances[0];
    const window = {
      rateLimitedUntil: Date.now() + 30_000,
      endpoint: '/api/payments',
      limit: 100,
    };

    act(() => channel.dispatchMessage({ type: 'RATE_LIMIT_SET', window }));

    expect(useRateLimitStore.getState()).toMatchObject(window);
    expect(channel.postMessage).not.toHaveBeenCalled();
  });

  it('broadcasts local rate-limit windows and closes the channel on unmount', () => {
    const { unmount } = renderHook(() => useCrossTabRateLimit());
    const channel = MockBroadcastChannel.instances[0];

    act(() => {
      useRateLimitStore.getState().setRateLimited(30, '/api/payments', 100);
    });

    expect(channel.postMessage).toHaveBeenCalledWith({
      type: 'RATE_LIMIT_SET',
      window: expect.objectContaining({
        endpoint: '/api/payments',
        limit: 100,
      }),
    });

    act(() => {
      useRateLimitStore.getState().clearRateLimit();
    });

    expect(channel.postMessage).toHaveBeenLastCalledWith({
      type: 'RATE_LIMIT_CLEAR',
    });

    unmount();

    expect(channel.removeEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
    );
    expect(channel.close).toHaveBeenCalledTimes(1);
  });
});
