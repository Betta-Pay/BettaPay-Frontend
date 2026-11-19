import { renderHook, act } from '@testing-library/react';
import { useSessionTimeout } from '../useSessionTimeout';

describe('useSessionTimeout Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, expiresAt: Date.now() + 1800000 }),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
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

  it('extends session via backend refresh call', async () => {
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
  });

  it('throttles rapid mousemove bursts so timer is not reset on every cursor movement', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 5000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    // Initial mount sets timer to expire at t=5000.
    // At t=1000, advance time and fire first mousemove.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    // First mousemove resets timer -> new expiration is at 1000 + 5000 = 6000.
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Fire rapid mousemove events at t=1200, t=1400, t=1600 (within 1000ms throttle interval).
    act(() => {
      jest.advanceTimersByTime(200);
      document.dispatchEvent(new Event('mousemove'));
      jest.advanceTimersByTime(200);
      document.dispatchEvent(new Event('mousemove'));
      jest.advanceTimersByTime(200);
      document.dispatchEvent(new Event('mousemove'));
    });

    // If throttled, the timer should still be rooted at t=1000 (expires at t=6000).
    // Let's advance to t=5999 (remaining 4400ms from t=1600).
    act(() => {
      jest.advanceTimersByTime(4399);
    });
    expect(result.current.showWarning).toBe(false);

    // Advance 1ms to reach t=6000 -> warning must be shown!
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.showWarning).toBe(true);
  });

  it('resets timer on mousemove after throttle interval elapses', () => {
    const onTimeout = jest.fn();
    const { result } = renderHook(() =>
      useSessionTimeout({
        timeoutMs: 5000,
        gracePeriodMs: 2000,
        onTimeout,
      })
    );

    // First mousemove at t=0
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Advance past throttle window (1000ms) to t=1500
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    // Second mousemove at t=1500 should reset timer to expire at 1500 + 5000 = 6500
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Advance to t=5000 (where original timer would have fired)
    act(() => {
      jest.advanceTimersByTime(3500);
    });
    expect(result.current.showWarning).toBe(false);

    // Advance to t=6500
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current.showWarning).toBe(true);
  });
});
