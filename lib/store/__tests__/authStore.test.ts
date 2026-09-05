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
});
