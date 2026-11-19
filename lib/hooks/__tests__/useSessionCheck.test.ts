import { renderHook, act } from '@testing-library/react';
import { useSessionCheck } from '../useSessionCheck';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/lib/navigation/routes';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

describe('useSessionCheck Hook', () => {
  const mockReplace = jest.fn();
  const mockPush = jest.fn();
  const mockLogout = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
    });

    (useAuthStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        isAuthenticated: false,
        isLoggedIn: true,
        login: mockLogin,
        logout: mockLogout,
      };
      return selector(state);
    });

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('awaits logout() before navigating via router.replace on invalid session', async () => {
    const executionOrder: string[] = [];
    mockLogout.mockImplementation(async () => {
      executionOrder.push('logout-start');
      await Promise.resolve();
      executionOrder.push('logout-complete');
      return { serverInvalidated: true };
    });
    mockReplace.mockImplementation(() => {
      executionOrder.push('router-replace');
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await act(async () => {
      renderHook(() => useSessionCheck());
      await Promise.resolve();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(ROUTES.LOGIN);
    expect(executionOrder).toEqual(['logout-start', 'logout-complete', 'router-replace']);
  });

  it('cancels pending 5-second timer when unmounted before timer fires', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: '1' }, token: 'valid-token' }),
    });

    const { unmount } = renderHook(() => useSessionCheck());

    // Trigger focus event to schedule the 5s timer
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Unmount before 5 seconds elapse
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('hydrates authStore with user and token on valid session check', async () => {
    const mockUser = { id: 'user-123', email: 'merchant@example.com' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: mockUser, token: 'token-abc' }),
    });

    await act(async () => {
      renderHook(() => useSessionCheck());
      await Promise.resolve();
    });

    expect(mockLogin).toHaveBeenCalledWith('token-abc', mockUser);
    expect(mockLogout).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
