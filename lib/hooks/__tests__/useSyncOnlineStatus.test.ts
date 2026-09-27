import { renderHook } from '@testing-library/react';
import { useSyncOnlineStatus } from '@/lib/hooks/useSyncOnlineStatus';
import { useOfflineStore } from '@/lib/store/offlineStore';

beforeEach(() => {
  useOfflineStore.setState({ isOnline: true });
});

describe('useSyncOnlineStatus', () => {
  it('does not change store when navigator is undefined (SSR)', () => {
    const originalNavigator = global.navigator;
    // @ts-expect-error -- simulate SSR where navigator is undefined
    delete global.navigator;

    renderHook(() => useSyncOnlineStatus());

    expect(useOfflineStore.getState().isOnline).toBe(true);
    global.navigator = originalNavigator;
  });

  it('syncs store with navigator.onLine after mount', () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });

    renderHook(() => useSyncOnlineStatus());

    expect(useOfflineStore.getState().isOnline).toBe(false);
  });

  it('sets store to true when navigator.onLine is true', () => {
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true });

    renderHook(() => useSyncOnlineStatus());

    expect(useOfflineStore.getState().isOnline).toBe(true);
  });
});
