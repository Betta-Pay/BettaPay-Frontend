import { renderHook, act } from '@testing-library/react';
import {
  useOnlineStatus,
  CONNECTIVITY_BROADCAST_CHANNEL,
  type ConnectivityBroadcastMessage,
} from '../useOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';

class MockBroadcastChannel {
  static channels = new Map<string, Set<MockBroadcastChannel>>();
  readonly name: string;
  onmessage: ((event: MessageEvent<ConnectivityBroadcastMessage>) => void) | null = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    const peers = MockBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    MockBroadcastChannel.channels.set(name, peers);
  }

  postMessage(data: ConnectivityBroadcastMessage) {
    if (this.closed) return;
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) return;
    for (const peer of peers) {
      if (peer !== this && !peer.closed && peer.onmessage) {
        peer.onmessage({ data } as MessageEvent<ConnectivityBroadcastMessage>);
      }
    }
  }

  close() {
    this.closed = true;
    MockBroadcastChannel.channels.get(this.name)?.delete(this);
  }

  static reset() {
    MockBroadcastChannel.channels.clear();
  }
}

describe('useOnlineStatus BroadcastChannel synchronization (#907)', () => {
  const originalBroadcastChannel = global.BroadcastChannel;
  const originalFetch = global.fetch;

  beforeEach(() => {
    MockBroadcastChannel.reset();
    global.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
    global.fetch = jest.fn().mockResolvedValue({ status: 200 } as Response);
    act(() => {
      useOfflineStore.setState({ isOnline: true, isApiReachable: true, dismissed: false });
    });
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    global.fetch = originalFetch;
    MockBroadcastChannel.reset();
  });

  it('synchronizes offline and online transitions across sibling tabs via BroadcastChannel', async () => {
    const { result, unmount } = renderHook(() => useOnlineStatus());
    const siblingTabChannel = new MockBroadcastChannel(CONNECTIVITY_BROADCAST_CHANNEL);

    expect(result.current).toBe(true);

    // Sibling tab broadcasts offline state
    act(() => {
      siblingTabChannel.postMessage({
        isOnline: false,
        isApiReachable: false,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toBe(false);
    expect(useOfflineStore.getState().isOnline).toBe(false);

    // Sibling tab broadcasts restored connectivity
    act(() => {
      siblingTabChannel.postMessage({
        isOnline: true,
        isApiReachable: true,
        timestamp: Date.now(),
      });
    });

    expect(result.current).toBe(true);
    expect(useOfflineStore.getState().isOnline).toBe(true);

    siblingTabChannel.close();
    unmount();
  });

  it('broadcasts offline event from current tab to sibling tabs', () => {
    const received: ConnectivityBroadcastMessage[] = [];
    const siblingTabChannel = new MockBroadcastChannel(CONNECTIVITY_BROADCAST_CHANNEL);
    siblingTabChannel.onmessage = (ev) => {
      received.push(ev.data);
    };

    const { unmount } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(received[received.length - 1]).toMatchObject({
      isOnline: false,
      isApiReachable: false,
    });

    siblingTabChannel.close();
    unmount();
  });

  it('gracefully falls back to window events when BroadcastChannel is unsupported', () => {
    // @ts-expect-error simulating environment without BroadcastChannel
    delete global.BroadcastChannel;

    const { result, unmount } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
    unmount();
  });
});
