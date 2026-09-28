import { middleware, config } from '../middleware';
import type { NextRequest } from 'next/server';

jest.mock('next/server', () => {
  return {
    NextResponse: {
      next: jest.fn().mockImplementation(() => ({
        status: 200,
        headers: new Map(),
        next: true,
        cookies: { set: jest.fn() },
      })),
      redirect: jest.fn().mockImplementation((url) => ({
        status: 307,
        headers: new Map([['location', url.toString()]]),
        redirect: true,
        destination: url.toString(),
        cookies: { set: jest.fn() },
      })),
      rewrite: jest.fn().mockImplementation((url) => ({
        status: 200,
        headers: new Map(),
        rewrite: true,
        url: url.toString(),
        cookies: { set: jest.fn() },
      })),
    },
  };
});

import { NextResponse } from 'next/server';

describe('Next.js Middleware Auth & RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (pathname: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) => {
    return {
      url: `http://localhost:3000${pathname}`,
      nextUrl: {
        pathname,
        clone: jest.fn().mockImplementation(function (this: any) {
          return { ...this, pathname: this.pathname };
        }),
      },
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
      cookies: {
        get: (name: string) => {
          const value = cookies[name];
          return value ? { value } : undefined;
        },
      },
    } as unknown as NextRequest;
  };

  describe('Locale path-based routing', () => {
    it('redirects bare /dashboard to /en/dashboard (default locale)', () => {
      const req = mockRequest('/dashboard');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/dashboard');
    });

    it('redirects bare / to /en (default locale)', () => {
      const req = mockRequest('/');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en');
    });

    it('rewrites /en/dashboard to serve internal /dashboard', () => {
      const req = mockRequest('/en/dashboard', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
      const rewriteUrl = (NextResponse.rewrite as jest.Mock).mock.calls[0][0];
      expect(rewriteUrl.toString()).toContain('/dashboard');
    });

    it('rewrites /fr/dashboard to serve internal /dashboard', () => {
      const req = mockRequest('/fr/dashboard', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
      const rewriteUrl = (NextResponse.rewrite as jest.Mock).mock.calls[0][0];
      expect(rewriteUrl.toString()).toContain('/dashboard');
    });

    it('redirects /fr/auth/login to /fr/dashboard when authenticated', () => {
      const req = mockRequest('/fr/auth/login', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/fr/dashboard');
    });

    it('sets NEXT_LOCALE cookie on responses with locale prefix', () => {
      const req = mockRequest('/fr/dashboard', { auth_token: 'valid_token', user_role: 'merchant' });
      const res = middleware(req);
      expect(res.cookies.set).toHaveBeenCalledWith(
        'NEXT_LOCALE',
        'fr',
        expect.objectContaining({ path: '/' }),
      );
    });

    it('uses Accept-Language header to detect locale for bare paths', () => {
      const req = mockRequest('/dashboard', {}, { 'accept-language': 'fr-FR,fr;q=0.9' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/fr/dashboard');
    });

    it('uses NEXT_LOCALE cookie to detect locale for bare paths', () => {
      const req = mockRequest('/dashboard', { NEXT_LOCALE: 'pt' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/pt/dashboard');
    });

    it('does not treat unknown prefixes as locales', () => {
      const req = mockRequest('/api/auth/session');
      // /api is excluded by matcher anyway, but if it reached middleware
      // it should not be treated as a locale
      middleware(req);
      // Should redirect to /en/api/auth/session (bare path → locale prefix)
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/api/auth/session');
    });
  });

  describe('Unauthenticated redirects', () => {
    it('redirects unauthenticated user to /en/auth/login for /en/dashboard', () => {
      const req = mockRequest('/en/dashboard');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/auth/login');
    });

    it('redirects unauthenticated user to /en/auth/login for /en/overview', () => {
      const req = mockRequest('/en/overview');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/auth/login');
    });
  });

  describe('Authenticated merchant redirects', () => {
    it('allows authenticated merchant to access /en/dashboard', () => {
      const req = mockRequest('/en/dashboard', { auth_token: 'valid_token', user_role: 'merchant' });
      const res = middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
    });

    it('redirects authenticated merchant from /en/overview to /en/dashboard', () => {
      const req = mockRequest('/en/overview', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/dashboard');
    });
  });

  describe('Authenticated admin redirects', () => {
    it('allows authenticated admin to access /en/overview', () => {
      const req = mockRequest('/en/overview', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
    });

    it('redirects authenticated admin from /en/dashboard to /en/overview', () => {
      const req = mockRequest('/en/dashboard', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/overview');
    });
  });

  describe('Auth pages', () => {
    it('allows unauthenticated user to access /en/auth/login', () => {
      const req = mockRequest('/en/auth/login');
      middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
    });

    it('redirects authenticated merchant from /en/auth/login to /en/dashboard', () => {
      const req = mockRequest('/en/auth/login', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/dashboard');
    });

    it('redirects authenticated admin from /en/auth/login to /en/overview', () => {
      const req = mockRequest('/en/auth/login', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/overview');
    });
  });

  describe('Public routes', () => {
    it('allows access to /en/pay/link123 without auth', () => {
      const req = mockRequest('/en/pay/link123');
      middleware(req);
      expect(NextResponse.rewrite).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('Middleware config matcher', () => {
    // Mirrors Next.js `:path*` matching (prefix or prefix + any number of
    // segments) against the positive allow-list in `config.matcher`.
    const matchesAnyMatcher = (path: string): boolean =>
      config.matcher.some((pattern) => {
        const wildcard = pattern.indexOf('/:path*');
        const prefix = wildcard === -1 ? pattern : pattern.slice(0, wildcard);
        return path === prefix || path.startsWith(`${prefix}/`);
      });

    it('includes every route that needs authentication evaluation', () => {
      const authAwarePaths = [
        '/auth/login',
        '/auth/magic',
        '/onboarding',
        '/onboarding/step-2',
        '/dashboard',
        '/dashboard/revenue',
        '/transactions',
        '/wallet',
        '/fx',
        '/developers',
        '/settings',
        '/payments',
        '/settlement',
        '/payment-links',
        '/notifications',
        '/overview',
        '/merchants',
        '/merchants/kyb',
        '/anchors',
        '/fx-management',
        '/compliance',
        '/admin',
        '/pay/link_1',
        '/pay/status/tx_1',
      ];
      for (const path of authAwarePaths) {
        if (!matchesAnyMatcher(path)) {
          throw new Error(`expected matcher to include ${path}`);
        }
      }
    });

    it('excludes static assets, API routes, and public/marketing pages', () => {
      const bypassedPaths = [
        '/',
        '/about',
        '/pricing',
        '/docs',
        '/docs/api-reference',
        '/contact',
        '/privacy',
        '/terms',
        '/fiat-settlements',
        '/guides',
        '/sdks',
        '/status',
        '/api/auth/session',
        '/api/payments',
        '/_next/static/chunks/main.js',
        '/_next/image?url=logo.png',
        '/favicon.ico',
        '/fonts/GeistVF.woff',
      ];
      for (const path of bypassedPaths) {
        if (matchesAnyMatcher(path)) {
          throw new Error(`expected matcher to exclude ${path}`);
        }
      }
    });
  });
});
