import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Ensure fetch is available before any module initializes
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
});

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
      json: () => Promise.resolve({ success: true }),
    });
    mockPush.mockClear();
  });

  describe('Login Page Validation', () => {
    it('shows validation errors for empty or invalid fields', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');

      // Submit empty form to trigger errors
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

      // Type a short password to trigger its error
      await user.type(passwordInput, 'short');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });

      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    });

    it('clears the email error when a valid email is typed after an invalid submission', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      const submitBtn = screen.getByRole('button', { name: /Sign In/i });

      await user.click(submitBtn);
      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });

      await user.type(emailInput, 'valid@example.com');

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'false');
        expect(emailInput).not.toHaveAttribute('aria-describedby');
      });
    });

    it('redirects to /dashboard on valid form submission', async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      await user.type(screen.getByLabelText(/Email Address/i), 'user@example.com');
      await user.type(screen.getByLabelText(/Password/i), 'securepassword123');
      await user.click(screen.getByRole('button', { name: /Sign In/i }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Register Page Validation', () => {
    it('shows error messages for empty fields with correct aria attributes', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<RegisterPage />);

      const businessNameInput = screen.getByLabelText(/Business Name/i);
      const emailInput = screen.getByLabelText(/Work Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign Up/i });

      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Business name must be at least 2 characters')).toBeInTheDocument();
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        expect(screen.getByText('Country is required')).toBeInTheDocument();
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });

      expect(businessNameInput).toHaveAttribute('aria-invalid', 'true');
      expect(businessNameInput).toHaveAttribute('aria-describedby', 'businessName-error');

      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');

      jest.useRealTimers();
    });

    it('redirects to /auth/login on successful register submission', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<RegisterPage />);

      const businessNameInput = screen.getByLabelText(/Business Name/i);
      const emailInput = screen.getByLabelText(/Work Email/i);
      const select = screen.getByTestId('mock-select');
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitBtn = screen.getByRole('button', { name: /Sign Up/i });

      await user.type(businessNameInput, 'Stellar Biz');
      await user.type(emailInput, 'stellar@biz.com');
      await user.selectOptions(select, 'NG');
      await user.type(passwordInput, 'validpassword123');

      await user.click(submitBtn);

      // Advance past any internal timers (e.g. the 1500ms fallback in onSubmit catch)
      jest.runAllTimers();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login');
      });

      jest.useRealTimers();
    });
  });
});
