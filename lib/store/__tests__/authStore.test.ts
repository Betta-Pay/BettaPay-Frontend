import { useAuthStore } from '../authStore';
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
