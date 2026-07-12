/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Establish fetch mock before any module that calls fetch on import/init
global.fetch = jest.fn();

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock dynamic import of WalletModal to a synchronous component
jest.mock('next/dynamic', () => {
  return () => {
    return (props: any) => {
      if (!props.open) return <div data-testid="mock-wallet-modal" />;
      return (
        <div data-testid="mock-wallet-modal">
          <button
            data-testid="connect-wallet-button"
            onClick={() => props.onConnected?.('GBX1234567890ABCDEF')}
          >
            Simulate Connect
          </button>
        </div>
      );
    };
  };
});

// Mock Google Login (requires GoogleOAuthProvider wrapper in real app)
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: any) => (
    <button
      data-testid="mock-google-login"
      onClick={() => onSuccess?.({ credential: 'mock_google_id_token' })}
    >
      Continue with Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
}));

// Mock Freighter signChallenge
jest.mock('@/lib/stellar/freighter', () => ({
  signChallenge: jest.fn().mockResolvedValue('mock_base64_signature'),
}));

// Mock sonner toast
jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: jest.fn()
}));

import LoginPage from '../login/page';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotify } from '@/lib/hooks/useNotify';

const MERCHANT_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZXJjaGFudElkIjoibWVyY2hfMTIzIiwib3duZXJJZCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoibWVyY2hhbnQifQ.test';

describe('Login Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default fetch mock: all endpoints succeed with generic responses
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/auth/wallet/challenge')) {
        return {
          ok: true,
          json: () => Promise.resolve({ challenge: 'BettaPay:GBX1234567890ABCDEF:testnonce', expiresAt: Date.now() + 120000 }),
        };
      }
      if (url.includes('/api/auth/wallet/verify') || url.includes('/api/auth/google')) {
        return {
          ok: true,
          json: () => Promise.resolve({ token: MERCHANT_JWT }),
        };
      }
      return {
        ok: true,
        json: () => Promise.resolve({}),
      };
    });
    // Reset useNotify mock
    (useNotify as jest.Mock).mockReturnValue({
      success: jest.fn(),
      error: jest.fn(),
    });
    // Reset Zustand auth state without triggering the real fetch in logout()
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
    });
  });

  it('performs Google sign-in and redirects to /dashboard', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByTestId('mock-google-login'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/auth\/google$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ idToken: 'mock_google_id_token' }),
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: MERCHANT_JWT, role: 'merchant' }),
        })
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.role).toBe('merchant');

      const { success } = useNotify();
      expect(success).toHaveBeenCalledWith('Login successful');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('triggers wallet login flow and redirects to /dashboard', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Open the wallet modal
    await user.click(screen.getByRole('button', { name: /Connect Freighter Wallet/i }));

    // Trigger the mocked wallet connection callback
    await user.click(screen.getByTestId('connect-wallet-button'));

    await waitFor(() => {
      // 1. Fetch challenge
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/wallet/challenge?address=GBX1234567890ABCDEF')
      );

      // 2. Verify signature
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/wallet/verify'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            address: 'GBX1234567890ABCDEF',
            challenge: 'BettaPay:GBX1234567890ABCDEF:testnonce',
            signature: 'mock_base64_signature',
          }),
        })
      );

      // 3. Set session
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/session',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: MERCHANT_JWT, role: 'merchant' }),
        })
      );

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.role).toBe('merchant');

      const { success } = useNotify();
      expect(success).toHaveBeenCalledWith('Login successful');
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows an error toast when the wallet challenge fetch fails', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/auth/wallet/challenge')) {
        return { ok: false, json: () => Promise.resolve({ error: 'Rate limited' }) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    });

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Connect Freighter Wallet/i }));
    await user.click(screen.getByTestId('connect-wallet-button'));

    await waitFor(() => {
      const { error } = useNotify();
      expect(error).toHaveBeenCalled();
    });
  });

  it('shows an error toast when the wallet verify fails', async () => {
    const user = userEvent.setup();

    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('/api/auth/wallet/challenge')) {
        return {
          ok: true,
          json: () => Promise.resolve({ challenge: 'BettaPay:GBX1234567890ABCDEF:testnonce', expiresAt: Date.now() + 120000 }),
        };
      }
      if (url.includes('/api/auth/wallet/verify')) {
        return { ok: false, json: () => Promise.resolve({ error: 'Invalid signature' }) };
      }
      return { ok: true, json: () => Promise.resolve({}) };
    });

    render(<LoginPage />);

    await user.click(screen.getByRole('button', { name: /Connect Freighter Wallet/i }));
    await user.click(screen.getByTestId('connect-wallet-button'));

    await waitFor(() => {
      const { error } = useNotify();
      expect(error).toHaveBeenCalledWith('Invalid signature');
    });
  });
});
