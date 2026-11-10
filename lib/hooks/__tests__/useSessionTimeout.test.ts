import { renderHook, act } from '@testing-library/react';
import {
  useSessionTimeout,
  DEFAULT_IDLE_TIMEOUT_MS,
} from '../useSessionTimeout';

describe('useSessionTimeout Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.removeAttribute('data-session-locked');
    document.body.innerHTML = '<main id="main-content">Sensitive Payout Balance</main>';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, expiresAt: Date.now() + 1800000 }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    document.documentElement.removeAttribute('data-session-locked');
    document.body.innerHTML = '';
  });

  it('defaults to a 15-minute inactivity timeout and blurs sensitive content when locked', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        onTimeout,
      })
    );

    expect(DEFAULT_IDLE_TIMEOUT_MS).toBe(15 * 60 * 1000);
    expect(result.current.showWarning).toBe(false);
    expect(result.current.isLocked).toBe(false);

    act(() => {
      jest.advanceTimersByTime(DEFAULT_IDLE_TIMEOUT_MS);
    });

    expect(result.current.showWarning).toBe(true);
    expect(result.current.isLocked).toBe(true);
    expect(document.documentElement.getAttribute('data-session-locked')).toBe('true');
    const main = document.getElementById('main-content');
    expect(main?.classList.contains('blur-sm')).toBe(true);
    expect(main?.getAttribute('aria-hidden')).toBe('true');
  });

  it('starts inactive timer and triggers warning after timeoutMs', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 500,
        onTimeout,
      })
    );

    expect(result.current.showWarning).toBe(false);

    // Fast-forward past timeoutMs
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.showWarning).toBe(true);
    expect(result.current.isLocked).toBe(true);
  });

  it('triggers onTimeout after gracePeriodMs expires', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000); // Trigger warning
    });
    expect(result.current.showWarning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2000); // Elapse grace period
    });

    expect(onTimeout).toHaveBeenCalled();
  });

  it('extends session via backend refresh call and removes blur lock', async () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.showWarning).toBe(true);
    expect(result.current.isLocked).toBe(true);

    let extended = false;
    await act(async () => {
      extended = await result.current.extendSession();
    });

    expect(extended).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/refresh',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.current.showWarning).toBe(false);
    expect(result.current.isLocked).toBe(false);
    expect(document.documentElement.getAttribute('data-session-locked')).toBeNull();
    expect(document.getElementById('main-content')?.classList.contains('blur-sm')).toBe(false);
  });

  it('supports unlockSession with PIN/password validation', async () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 1000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    act(() => {
      result.current.lockSession();
    });
    expect(result.current.isLocked).toBe(true);

    // Empty credential fails
    let unlocked = true;
    await act(async () => {
      unlocked = await result.current.unlockSession('   ');
    });
    expect(unlocked).toBe(false);
    expect(result.current.isLocked).toBe(true);

    // Valid credential unlocks and refreshes session
    await act(async () => {
      unlocked = await result.current.unlockSession('1234');
    });
    expect(unlocked).toBe(true);
    expect(result.current.isLocked).toBe(false);
  });
});
