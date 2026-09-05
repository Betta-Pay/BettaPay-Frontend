/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Ensure fetch is available before any module initializes
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ token: 'mock_jwt', user: { id: '1', email: 'test@example.com', name: 'Test', role: 'merchant' } }),
});

// Mock useRouter
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Mock dynamic import of WalletModal
jest.mock('next/dynamic', () => {
  return () => () => <div data-testid="mock-wallet-modal" />;
});

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// The login page also consults NEXT_PUBLIC_GOOGLE_CLIENT_ID to decide
// whether to mount the real <GoogleLogin> or render a disabled fallback.
// Make the env var present so the happy-path render is covered here; the
// missing-config path is covered by a dedicated test in
// googleLoginFallback.test.tsx.
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'mock-client-id-for-tests';

// Mock Google Login (requires GoogleOAuthProvider wrapper in real app)
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="mock-google-login">Continue with Google</button>,
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
}));

// Mock Freighter signChallenge
jest.mock('@/lib/stellar/freighter', () => ({
  signChallenge: jest.fn().mockResolvedValue('mock_signature'),
}));

// Mock layout components used by RegisterPage
jest.mock('@/components/layout/Header', () => () => <header data-testid="mock-header" />);
jest.mock('@/components/layout/Footer', () => () => <footer data-testid="mock-footer" />);

// Mock walletStore so RegisterPage renders without open handles
jest.mock('@/lib/store/walletStore', () => {
  const mockState: Record<string, unknown> = {
    connect: jest.fn().mockResolvedValue(undefined),
    address: null,
    walletModalOpen: false,
    setWalletModalOpen: jest.fn(),
    signMessage: jest.fn().mockResolvedValue('mock_signature'),
    walletConnectPending: false,
    connectError: null,
  };
  const fn = jest.fn((selector: (s: typeof mockState) => unknown) => selector(mockState));
  (fn as unknown as Record<string, unknown>).getState = () => mockState;
  (fn as unknown as Record<string, unknown>).setState = jest.fn();
  return {
    useWalletStore: Object.assign(fn, {
      getState: () => mockState,
      setState: jest.fn(),
    }),
  };
});

// Mock apiClient and base URL helpers
jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { id: 'merchant_id', name: 'Test' } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
  resolveApiBaseUrl: jest.fn(() => 'http://localhost:3001'),
  getApiBaseUrl: jest.fn(() => 'http://localhost:3001'),
  DEFAULT_API_BASE_URL: 'http://localhost:3001',
  setApiBaseUrl: jest.fn(),
  resetApiBaseUrl: jest.fn(),
}));

jest.mock('@/lib/config/api', () => ({
  getApiBaseUrl: jest.fn(() => 'http://localhost:3001'),
  resolveApiBaseUrl: jest.fn(() => 'http://localhost:3001'),
  DEFAULT_API_BASE_URL: 'http://localhost:3001',
  setApiBaseUrl: jest.fn(),
  resetApiBaseUrl: jest.fn(),
  warnIfApiUnreachable: jest.fn(),
}));

// Mock the UI Select component as a plain <select> without nesting buttons inside it
jest.mock('@/components/ui/select', () => {
  const React = require('react');
  return {
    Select: ({ children, onValueChange }: any) => (
      <select
        data-testid="mock-select"
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    ),
    SelectTrigger: (_props: any) => null,
    SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  };
});

import LoginPage from '../login/page';
import RegisterPage from '../register/page';

describe('Authentication Form Validation & Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ token: 'mock_jwt', user: { id: '1', email: 'test@example.com', name: 'Test', role: 'merchant' } }),
    });
    mockPush.mockClear();
  });

  describe('Login Page', () => {
    it('renders Google Sign-In and Freighter Wallet buttons', () => {
      render(<LoginPage />);

      expect(screen.getByTestId('mock-google-login')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Connect Freighter Wallet/i })).toBeInTheDocument();
    });

    it('opens wallet modal when Freighter Wallet button is clicked', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.click(screen.getByRole('button', { name: /Connect Freighter Wallet/i }));

      expect(screen.getByTestId('mock-wallet-modal')).toBeInTheDocument();
    });

    it('renders email and password inputs with correct autocomplete and name attributes', () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);

      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('focuses the email input on failed submit with empty fields and sets aria attributes', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /Sign In with Email/i });
      const emailInput = screen.getByLabelText(/Email address/i);

      await user.click(submitButton);

      // Focus should move to email input
      expect(emailInput).toHaveFocus();
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error');
      expect(screen.getByText('Email address is required')).toBeInTheDocument();
    });

    it('focuses the password input when email is valid but password is empty', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In with Email/i });

      await user.type(emailInput, 'merchant@bettapay.com');
      await user.click(submitButton);

      expect(passwordInput).toHaveFocus();
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'login-password-error');
    });
  });

  describe('Register Page', () => {
    it('renders full registration form with correct autocomplete and name attributes', () => {
      render(<RegisterPage />);

      const nameInput = screen.getByLabelText(/Full Name/i);
      const emailInput = screen.getByLabelText(/Email address/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);

      expect(nameInput).toHaveAttribute('name', 'name');
      expect(nameInput).toHaveAttribute('autoComplete', 'name');

      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');

      expect(confirmPasswordInput).toHaveAttribute('name', 'confirmPassword');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');
    });

    it('focuses first errored input on submit failure and associates aria-describedby', async () => {
      const user = userEvent.setup();
      render(<RegisterPage />);

      const submitButton = screen.getByRole('button', { name: /Create Account/i });
      const nameInput = screen.getByLabelText(/Full Name/i);

      await user.click(submitButton);

      expect(nameInput).toHaveFocus();
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput).toHaveAttribute('aria-describedby', 'register-name-error');
    });
  });
});

