/* eslint-disable react/display-name, @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../login/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/auth/login',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

// Stub i18n so we don't have to spin up react-i18next's provider tree
// just to test the fallback button.
jest.mock('@/lib/i18n/useAppTranslation', () => ({
  useAppTranslation: () => ({
    t: (key: string) => key,
    i18n: { isInitialized: true, language: 'en', changeLanguage: jest.fn() },
    ready: true,
  }),
}));

// useLogin internally calls useRouter/useAuthStore/Freighter sign chain
// which is irrelevant to the fallback button. Stub it with no-ops so the
// test can render the page in isolation.
jest.mock('@/lib/hooks/useLogin', () => ({
  useLogin: () => ({
    isWalletLoading: false,
    walletModalOpen: false,
    setWalletModalOpen: jest.fn(),
    onGoogleSuccess: jest.fn(),
    onWalletConnected: jest.fn(),
    error: jest.fn(),
  }),
}));

// next/dynamic's WalletModal pulls in Next.js' loadable runtime which
// needs a router context we don't set up here. Stub it like the
// other login tests do.
jest.mock('next/dynamic', () => () => () => null);

// lucide-react v1 reads from an internal theme context that isn't set up
// under jsdom. Stub it with a Proxy<{}, {}> that returns the same stub SVG
// for any named icon — the login page only uses named imports (Loader2,
// Shield, Zap, Globe, ArrowRight) so a single stub handles all of them.
// NB: tests that want to query icons should use getAllByTestId, since
// every mocked icon shares the same `data-testid`.
jest.mock('lucide-react', () => {
  const stub = ({ children, ...props }: any) => (
    <svg data-testid="mock-icon" {...props}>
      {children}
    </svg>
  );
  return new Proxy(
    {},
    {
      get: (_target, prop: string) =>
        typeof prop === 'string' && prop !== 'default' ? stub : undefined,
    },
  );
});

jest.mock('@/components/auth/EmailLoginForm', () => ({
  EmailLoginForm: () => null,
}));

jest.mock('@/components/auth/MagicLinkForm', () => ({
  MagicLinkForm: () => null,
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button data-testid="mock-google-login">Continue with Google</button>,
  GoogleOAuthProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

beforeEach(async () => {
  // Force the missing-config branch by deleting the env var.
  delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // Reset the module-level warning sentinel so each test can assert warn behavior.
  try {
    const mod = await import('../login/page');
    if (typeof (mod as any).__resetGoogleWarnForTests === 'function') {
      (mod as any).__resetGoogleWarnForTests();
    }
  } catch {}
  jest.clearAllMocks();
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  } else {
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = ORIGINAL_ENV;
  }
});

describe('Login page — Google OAuth fallback when client ID is missing', () => {
  it('renders a disabled Google placeholder instead of <GoogleLogin>', async () => {
    render(<LoginPage />);

    // The real Google button must NOT mount under any circumstances.
    expect(screen.queryByTestId('mock-google-login')).not.toBeInTheDocument();

    // The user gets an obvious, accessible disabled button with the
    // explanation baked into both the visible title and the aria-label.
    const fallback = screen.getByRole('button', { name: /Continue with Google/i });
    expect(fallback).toBeDisabled();
    expect(fallback).toHaveAttribute('aria-disabled', 'true');
    expect(fallback).toHaveAttribute(
      'title',
      'Google login not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    );
  });

  it('exposes the same tooltip message via hover', async () => {
    render(<LoginPage />);

    const fallback = screen.getByRole('button', {
      name: /Continue with Google/i,
    });
    const user = userEvent.setup();

    // Hover the tooltip wrapper so its inner tooltip becomes visible.
    await user.hover(fallback.parentElement as HTMLElement);

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(
        'Google login not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID',
      );
    });
  });

  it('logs a console.warn in development exactly once per bundle', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';
    // Ensure sentinel is reset for this specific warn test (beforeEach already did, but re-reset in case prior test set it)
    try {
      const mod = await import('../login/page');
      if (typeof (mod as any).__resetGoogleWarnForTests === 'function') (mod as any).__resetGoogleWarnForTests();
    } catch {}

    render(<LoginPage />);

    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('NEXT_PUBLIC_GOOGLE_CLIENT_ID'),
      );
    });

    // The module-level sentinel guarantees the warning fires at most once,
    // even if React mounts the page multiple times (Strict Mode, HMR, etc.).
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  it('does NOT warn in production builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';
    try {
      const mod = await import('../login/page');
      if (typeof (mod as any).__resetGoogleWarnForTests === 'function') (mod as any).__resetGoogleWarnForTests();
    } catch {}

    render(<LoginPage />);

    // Give the effect a tick to run if it were going to.
    await new Promise((r) => setTimeout(r, 10));
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
    (process.env as any).NODE_ENV = originalNodeEnv;
  });
});
