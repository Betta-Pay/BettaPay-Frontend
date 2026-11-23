import type { AxiosInstance } from 'axios';
import type { User } from '@/lib/types';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Verifies the 401 token-refresh flow: while a refresh is in flight, other 401s
// are queued and — once the refresh succeeds — re-issued so each caller receives
// its ACTUAL retried response (regression guard against resolving `undefined`).
describe('axios token-refresh queue', () => {
  let apiClient: AxiosInstance;
  let offlineStore: typeof import('@/lib/store/offlineStore').useOfflineStore;
  let authStore: typeof import('@/lib/store/authStore').useAuthStore;
  let setAppRouter: typeof import('@/lib/navigation/appRouter').setAppRouter;
  let hits: Record<string, number>;
  let refreshFails: boolean;
  let networkFails: boolean;

  beforeEach(() => {
    jest.resetModules();
    hits = {};
    refreshFails = false;
    networkFails = false;
    // Require axios fresh in this module registry generation so the SUT (also
    // required below) shares the exact instance we configure the adapter on.
    const axios = jest.requireActual<typeof import('axios')>('axios').default;

    const makeResponse = (config: import("axios").InternalAxiosRequestConfig, status: number, data: unknown) => ({
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config,
      request: {},
    });

    // Custom adapter used by both apiClient and refreshClient:
    // - /api/auth/refresh: succeeds after a short delay (keeps the refresh in
    //   flight long enough for the second request to be queued).
    // - any other URL: 401 on first hit, real 200 payload on the retry.
    const adapter = (config: import("axios").InternalAxiosRequestConfig) => {
      const url = config.url || '';
      if (url.includes('/api/auth/refresh')) {
        hits['/api/auth/refresh'] = (hits['/api/auth/refresh'] || 0) + 1;
        if (refreshFails) {
          return Promise.reject(
            new axios.AxiosError(
              'Unauthorized',
              'ERR_BAD_REQUEST',
              config,
              {},
              makeResponse(config, 401, { message: 'unauthorized' })
            )
          );
        }
        return new Promise((resolve) =>
          setTimeout(() => resolve(makeResponse(config, 200, { ok: true })), 20)
        );
      }
      if (networkFails) {
        return Promise.reject(new axios.AxiosError('Network Error', 'ERR_NETWORK', config, {}));
      }
      hits[url] = (hits[url] || 0) + 1;
      if (hits[url] === 1) {
        return Promise.reject(
          new axios.AxiosError(
            'Unauthorized',
            'ERR_BAD_REQUEST',
            config,
            {},
            makeResponse(config, 401, { message: 'unauthorized' })
          )
        );
      }
      offlineStore.setState({ isApiReachable: false });
      return Promise.resolve(makeResponse(config, 200, { value: `real-${url}` }));
    };

    axios.defaults.adapter = adapter as import('axios').AxiosAdapter;
    apiClient = jest.requireActual<typeof import('@/lib/api/axios')>('@/lib/api/axios').apiClient;
    // Use the store instance loaded with apiClient after resetModules.
    offlineStore = jest.requireActual<typeof import('@/lib/store/offlineStore')>('@/lib/store/offlineStore').useOfflineStore;
    authStore = jest.requireActual<typeof import('@/lib/store/authStore')>('@/lib/store/authStore').useAuthStore;
    setAppRouter = jest.requireActual<typeof import('@/lib/navigation/appRouter')>('@/lib/navigation/appRouter').setAppRouter;
    offlineStore.setState({ isOnline: true, isApiReachable: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('re-issues the first 401 request and returns the real response', async () => {
    const res = await apiClient.get('/protected-a');
    expect(res.data).toEqual({ value: 'real-/protected-a' });
    expect(offlineStore.getState().isApiReachable).toBe(true);
  });

  it('resolves a queued request with the real retried response, not undefined', async () => {
    // Fire two requests concurrently: the first drives the refresh, the second
    // hits 401 while the refresh is in flight and gets queued.
    const [first, second] = await Promise.all([
      apiClient.get('/protected-a'),
      apiClient.get('/protected-b'),
    ]);

    expect(first.data).toEqual({ value: 'real-/protected-a' });

    // The core regression: the queued request must resolve with its actual
    // AxiosResponse, not `undefined`.
    expect(second).toBeDefined();
    expect(second.data).toEqual({ value: 'real-/protected-b' });
    expect(offlineStore.getState().isApiReachable).toBe(true);
  });

  it('triggers only one /api/auth/refresh call for multiple concurrent 401 responses', async () => {
    const [first, second, third] = await Promise.all([
      apiClient.get('/protected-x'),
      apiClient.get('/protected-y'),
      apiClient.get('/protected-z'),
    ]);

    expect(first.data).toEqual({ value: 'real-/protected-x' });
    expect(second.data).toEqual({ value: 'real-/protected-y' });
    expect(third.data).toEqual({ value: 'real-/protected-z' });
    expect(hits['/api/auth/refresh']).toBe(1);
  });

  it('rejects all queued requests and resets isRefreshing when refresh fails', async () => {
    refreshFails = true;
    const p1 = apiClient.get('/fail-a');
    const p2 = apiClient.get('/fail-b');

    await expect(p1).rejects.toBeDefined();
    await expect(p2).rejects.toBeDefined();

    // Verify isRefreshing has reset to false: a subsequent request can attempt refresh again
    refreshFails = false;
    const p3 = await apiClient.get('/recover-c');
    expect(p3.data).toEqual({ value: 'real-/recover-c' });
  });

  it('resets expiry redirects after login and session token restoration', async () => {
    refreshFails = true;
    const push = jest.fn();
    setAppRouter({ push });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const user: User = {
      id: 'merchant-1',
      email: 'merchant@example.com',
      name: 'Merchant User',
      role: 'merchant',
      businessName: 'Merchant Co',
    };
    const token = [
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
      Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
      'signature',
    ].join('.');

    await expect(apiClient.get('/expiry-first')).rejects.toBeDefined();
    expect(push).toHaveBeenCalledTimes(1);

    authStore.getState().login(token, user);
    await expect(apiClient.get('/expiry-after-login')).rejects.toBeDefined();
    expect(push).toHaveBeenCalledTimes(2);

    authStore.setState({
      user,
      role: 'merchant',
      token: null,
      isAuthenticated: true,
      isLoggedIn: false,
    });
    authStore.getState().setToken(token);
    await expect(apiClient.get('/expiry-after-token-restore')).rejects.toBeDefined();
    expect(push).toHaveBeenCalledTimes(3);
  });

  it('avoids redirect loops on localized auth routes and preserves locale', async () => {
    refreshFails = true;
    const push = jest.fn();
    setAppRouter({ push });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    window.history.replaceState({}, '', '/fr/auth/login');
    await expect(apiClient.get('/auth-page')).rejects.toBeDefined();
    expect(push).not.toHaveBeenCalled();

    window.history.replaceState({}, '', '/fr/dashboard');
    await expect(apiClient.get('/dashboard')).rejects.toBeDefined();
    expect(push).toHaveBeenCalledWith('/fr/auth/login');
  });

  it('cancels a pending error notification when logging out', async () => {
    jest.useFakeTimers();
    networkFails = true;
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const { toast } = jest.requireMock<typeof import('sonner')>('sonner');
    (toast.error as jest.Mock).mockClear();
    const user: User = {
      id: 'merchant-1',
      email: 'merchant@example.com',
      name: 'Merchant User',
      role: 'merchant',
      businessName: 'Merchant Co',
    };
    const token = [
      Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),
      Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
      'signature',
    ].join('.');
    authStore.getState().login(token, user);

    await expect(apiClient.get('/network-failure')).rejects.toBeDefined();
    expect(offlineStore.getState().isApiReachable).toBe(false);
    await authStore.getState().logout();
    jest.advanceTimersByTime(200);

    expect(toast.error).not.toHaveBeenCalled();
  });
});
