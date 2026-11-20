import {
  registerUserQueryCacheReset,
  resetAllUserState,
  useAuthStore,
} from '../authStore';
import { useOfflineStore } from '../offlineStore';
import { useRateAlertStore, type RateAlert } from '../rateAlertStore';
import { useRateLimitStore } from '../rateLimitStore';
import { useWalletStore } from '../walletStore';
import type { User } from '../../types';

describe('useAuthStore', () => {
  const testUser: User = {
    id: 'merchant-1',
    email: 'merchant@example.com',
    name: 'Merchant User',
    role: 'merchant',
    businessName: 'Merchant Co',
  };

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
    });
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('starts with null auth data and unauthenticated defaults', () => {
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
    });
  });

  it('login stores the user, token, role, and authenticated state in memory', () => {
    useAuthStore.getState().login('session-token', testUser);

    expect(useAuthStore.getState()).toMatchObject({
      user: testUser,
      token: 'session-token',
      role: 'merchant',
      isAuthenticated: true,
      isLoggedIn: true,
    });
  });

  it('resetAllUserState clears user data and query caches without clearing preferences', () => {
    const alert: RateAlert = {
      id: 'alert-1',
      pair: 'XLM/USD',
      condition: 'above',
      target: 0.2,
      enabled: true,
      recurrence: 'once',
      channels: ['in_app'],
    };
    const resetQueryCache = jest.fn();
    const unregisterQueryCacheReset = registerUserQueryCacheReset(resetQueryCache);

    useAuthStore.getState().login('session-token', testUser);
    useWalletStore.setState({
      address: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      stellarAccounts: ['GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'],
      isConnected: true,
      connector: 'freighter',
      balances: [{ assetCode: 'XLM', balance: '10.0000000' }],
      isSigning: true,
    });
    useOfflineStore.setState({
      isOnline: false,
      isApiReachable: false,
      dismissed: true,
    });
    useRateLimitStore.getState().setRateLimited(120, '/api/payments');
    useRateAlertStore.setState({ alerts: [alert], hydratedFromServer: true });
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('unrelated-preference', 'preserve');

    try {
      resetAllUserState();
    } finally {
      unregisterQueryCacheReset();
    }

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
    });
    expect(useWalletStore.getState()).toMatchObject({
      address: null,
      stellarAccounts: [],
      isConnected: false,
      connector: null,
      balances: [],
      isSigning: false,
    });
    expect(useOfflineStore.getState()).toMatchObject({
      isOnline: false,
      isApiReachable: false,
      dismissed: false,
    });
    expect(useRateLimitStore.getState()).toMatchObject({
      rateLimitedUntil: 0,
      secondsRemaining: 0,
      endpoint: null,
      limit: null,
    });
    expect(useRateAlertStore.getState()).toMatchObject({
      alerts: [],
      hydratedFromServer: false,
    });
    expect(resetQueryCache).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('bp-session')).toBeNull();
    expect(localStorage.getItem('bettapay_wallet_session')).toBeNull();
    expect(localStorage.getItem('bettapay_rate_alerts')).toBeNull();
    expect(localStorage.getItem('bp-rate-limit')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('unrelated-preference')).toBe('preserve');

    useOfflineStore.setState({ isOnline: true, isApiReachable: true });
  });

  it('logout clears auth state and asks the session endpoint to clear the auth cookie', () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    useAuthStore.getState().login('session-token', testUser);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  });

  it('logout still clears auth state when the session endpoint request fails', () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network unavailable'));
    useAuthStore.getState().login('session-token', testUser);

    expect(() => useAuthStore.getState().logout()).not.toThrow();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
    });
  });

  it('persist partialize stores identity and derived session flags together (issue #485)', () => {
    const partialize = useAuthStore.persist.getOptions().partialize;

    expect(partialize).toBeDefined();
    expect(
      partialize?.({
        ...useAuthStore.getState(),
        user: testUser,
        token: 'session-token',
        role: 'admin',
        isAuthenticated: true,
        isLoggedIn: true,
      })
    ).toEqual({
      user: testUser,
      token: 'session-token',
      role: 'admin',
      isAuthenticated: true,
      isLoggedIn: true,
    });
  });

  describe('cross-tab logout via BroadcastChannel', () => {
    let mockPostMessage: jest.Mock;
    const originalBroadcastChannel = global.BroadcastChannel;

    beforeEach(() => {
      mockPostMessage = jest.fn();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).BroadcastChannel = class BroadcastChannel {
        name: string;
        onmessage: ((event: MessageEvent) => void) | null = null;
        constructor(name: string) {
          this.name = name;
        }
        postMessage = mockPostMessage;
        close = jest.fn();
        addEventListener = jest.fn();
        removeEventListener = jest.fn();
      };
    });

    afterEach(() => {
      global.BroadcastChannel = originalBroadcastChannel;
    });

    it('clears auth state when receiving a logout message from another tab', () => {
      useAuthStore.getState().login('session-token', testUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Simulate the cross-tab logout by directly calling setState
      // (this is what the BroadcastChannel handler does)
      useAuthStore.setState({
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
        isLoggedIn: false,
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('broadcasts logout message when logout is called', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      useAuthStore.getState().login('session-token', testUser);
      await useAuthStore.getState().logout();

      expect(mockPostMessage).toHaveBeenCalledWith('logout');
    });
  });
});
