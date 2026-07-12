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
jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    address: null,
  })),
}));

// Mock apiClient
jest.mock('@/lib/api/axios', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: { id: 'merchant_id', name: 'Test' } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
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
  });

  describe('Register Page', () => {
    it('redirects to /auth/login on mount', async () => {
      render(<RegisterPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/auth/login');
      });
    });
  });
});
