import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  HeaderAuthProvider,
  SESSION_EXPIRY_WARNING_SECONDS,
  extractJwtExpirationMs,
} from '@/components/layout/HeaderAuthContext';

describe('HeaderAuthContext — Session expiry warning (#894)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens the warning dialog 120 seconds before JWT expiration and refreshes silently on Stay Logged In', async () => {
    const nowMs = Date.now();
    const expSeconds = Math.floor(nowMs / 1000) + 300; // expires in 5 minutes (300s)
    const onRefreshSession = jest.fn().mockResolvedValue(expSeconds + 900);

    render(
      <HeaderAuthProvider
        value={{
          isAuthenticated: true,
          role: 'merchant',
          expiresAt: expSeconds,
          onRefreshSession,
        }}
      >
        <div>Protected Content</div>
      </HeaderAuthProvider>
    );

    expect(
      screen.queryByTestId('session-expiry-warning-modal')
    ).not.toBeInTheDocument();

    // Advance to 1 second before the 120s warning threshold (179s elapsed -> 121s left)
    act(() => {
      jest.advanceTimersByTime(
        (300 - SESSION_EXPIRY_WARNING_SECONDS - 1) * 1000
      );
    });
    expect(
      screen.queryByTestId('session-expiry-warning-modal')
    ).not.toBeInTheDocument();

    // Advance 1 more second to reach exactly exp - 120s
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const dialog = screen.getByTestId('session-expiry-warning-modal');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Session Expiring Soon')).toBeInTheDocument();

    // Clicking "Stay Logged In" refreshes the session without reloading
    fireEvent.click(screen.getByTestId('stay-logged-in-btn'));

    await waitFor(() => {
      expect(onRefreshSession).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId('session-expiry-warning-modal')
      ).not.toBeInTheDocument();
    });
  });

  it('parses the exp claim from a JWT string', () => {
    const expSeconds = 1900000000;
    const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
      'base64url'
    );
    const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString(
      'base64url'
    );
    const sampleToken = [header, payload, 'sig'].join('.');
    expect(extractJwtExpirationMs(sampleToken)).toBe(expSeconds * 1000);
  });
});
