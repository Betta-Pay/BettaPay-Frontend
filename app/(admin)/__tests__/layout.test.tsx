import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminLayout from '../layout';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { requireRoleFromCookies } from '@/lib/auth/requireRole';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
  headers: jest.fn(),
}));

jest.mock('@/lib/auth/requireRole', () => ({
  requireRoleFromCookies: jest.fn(),
}));

jest.mock('@/components/layout/AdminShell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-shell">{children}</div>
  ),
}));

describe('AdminLayout locale-aware redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupMocks = ({
    cookieLocale,
    nextUrl,
  }: {
    cookieLocale?: string;
    nextUrl?: string;
  }) => {
    (cookies as unknown as jest.Mock).mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === 'NEXT_LOCALE') {
          return cookieLocale ? { value: cookieLocale } : undefined;
        }
        return undefined;
      }),
    });

    (headers as unknown as jest.Mock).mockResolvedValue({
      get: jest.fn((name: string) => {
        if (name === 'next-url') return nextUrl ?? null;
        return null;
      }),
    });
  };

  it('redirects unauthenticated requests on /fr/overview directly to /fr/auth/login', async () => {
    (requireRoleFromCookies as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      role: null,
    });
    setupMocks({ nextUrl: '/fr/overview' });

    await expect(AdminLayout({ children: <div>Admin Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/fr/auth/login'
    );
    expect(redirect).toHaveBeenCalledWith('/fr/auth/login');
  });

  it('redirects unauthenticated requests using NEXT_LOCALE cookie to /fr/auth/login', async () => {
    (requireRoleFromCookies as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      role: null,
    });
    setupMocks({ cookieLocale: 'fr' });

    await expect(AdminLayout({ children: <div>Admin Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/fr/auth/login'
    );
    expect(redirect).toHaveBeenCalledWith('/fr/auth/login');
  });

  it('redirects authenticated merchant requests to /fr/dashboard', async () => {
    (requireRoleFromCookies as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      role: 'merchant',
    });
    setupMocks({ nextUrl: '/fr/overview' });

    await expect(AdminLayout({ children: <div>Admin Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/fr/dashboard'
    );
    expect(redirect).toHaveBeenCalledWith('/fr/dashboard');
  });

  it('resolves default-locale redirects to /en/auth/login', async () => {
    (requireRoleFromCookies as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      role: null,
    });
    setupMocks({});

    await expect(AdminLayout({ children: <div>Admin Content</div> })).rejects.toThrow(
      'NEXT_REDIRECT:/en/auth/login'
    );
    expect(redirect).toHaveBeenCalledWith('/en/auth/login');
  });

  it('renders AdminShell for authorized admin without redirecting', async () => {
    (requireRoleFromCookies as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      role: 'admin',
    });
    setupMocks({});

    const element = await AdminLayout({ children: <div>Protected Admin Content</div> });
    render(element);

    expect(screen.getByTestId('admin-shell')).toBeInTheDocument();
    expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
