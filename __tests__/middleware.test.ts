import { middleware, config, isSafeRedirect, normalizeTrailingSlash, extractLocaleFromPathname } from '../middleware';
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

  const mockRequest = (urlOrPath: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) => {
    const fullUrl = urlOrPath.startsWith('http') ? urlOrPath : `http://localhost:3000${urlOrPath}`;
    const parsed = new URL(fullUrl);
    const pathname = parsed.pathname;
    const search = parsed.search;
    return {
      url: fullUrl,
      nextUrl: {
        pathname,
        search,
        searchParams: parsed.searchParams,
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
      expect(redirectUrl.searchParams.get('redirect')).toBe('/en/dashboard');
    });

    it('redirects unauthenticated user to /en/auth/login for /en/overview', () => {
      const req = mockRequest('/en/overview');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/auth/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe('/en/overview');
    });

    it('preserves requested path and query string when redirecting to login', () => {
      const req = mockRequest('/en/settlement/?tab=rules');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/auth/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe('/en/settlement/?tab=rules');
      expect(redirectUrl.toString()).toBe('http://localhost:3000/en/auth/login?redirect=%2Fen%2Fsettlement%2F%3Ftab%3Drules');
    });
  });

  describe('Open-redirect validation', () => {
    it('rejects external URLs in redirect validation', () => {
      expect(isSafeRedirect('https://evil.com')).toBe(false);
      expect(isSafeRedirect('http://evil.com')).toBe(false);
      expect(isSafeRedirect('//evil.com')).toBe(false);
      expect(isSafeRedirect('//evil.com/path')).toBe(false);
      expect(isSafeRedirect('/\\evil.com')).toBe(false);
      expect(isSafeRedirect('\\evil.com')).toBe(false);
      expect(isSafeRedirect('javascript:alert(1)')).toBe(false);
      expect(isSafeRedirect('data:text/html;base64,bad')).toBe(false);
      expect(isSafeRedirect('')).toBe(false);
      expect(isSafeRedirect(null as any)).toBe(false);
      expect(isSafeRedirect(undefined as any)).toBe(false);
    });

    it('accepts safe relative redirect paths', () => {
      expect(isSafeRedirect('/en/settlement/?tab=rules')).toBe(true);
      expect(isSafeRedirect('/dashboard')).toBe(true);
      expect(isSafeRedirect('/en/dashboard/')).toBe(true);
      expect(isSafeRedirect('/overview?filter=pending')).toBe(true);
    });

    it('strips external redirect URL passed in query string when redirecting to login', () => {
      const req = mockRequest('/en/dashboard?redirect=https://evil.com');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe('/en/auth/login');
      expect(redirectUrl.searchParams.get('redirect')).toBe('/en/dashboard');
    });
  });

  describe('Trailing slash normalization', () => {
    it('normalizes trailing slashes while preserving root slash', () => {
      expect(normalizeTrailingSlash('/dashboard/')).toBe('/dashboard');
      expect(normalizeTrailingSlash('/dashboard///')).toBe('/dashboard');
      expect(normalizeTrailingSlash('/dashboard')).toBe('/dashboard');
      expect(normalizeTrailingSlash('/')).toBe('/');
    });

    it('extractLocaleFromPathname normalizes trailing slash on stripped path', () => {
      expect(extractLocaleFromPathname('/en/dashboard/')).toEqual({
        locale: 'en',
        stripped: '/dashboard',
      });
      expect(extractLocaleFromPathname('/fr/settings/profile/')).toEqual({
        locale: 'fr',
        stripped: '/settings/profile',
      });
      expect(extractLocaleFromPathname('/en/')).toEqual({
        locale: 'en',
        stripped: '/',
      });
    });

    it('matches route guards identically for trailing-slash paths like /dashboard/', () => {
      // Unauthenticated redirect with trailing slash preserved in redirect param
      const unauthReq = mockRequest('/en/dashboard/');
      middleware(unauthReq);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const unauthRedirect = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(unauthRedirect.pathname).toBe('/en/auth/login');
      expect(unauthRedirect.searchParams.get('redirect')).toBe('/en/dashboard/');

      jest.clearAllMocks();

      // Merchant allowed to access /en/dashboard/
      const merchantReq = mockRequest('/en/dashboard/', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(merchantReq);
      expect(NextResponse.rewrite).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // Admin redirected away from /en/dashboard/
      const adminReq = mockRequest('/en/dashboard/', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(adminReq);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const adminRedirect = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(adminRedirect.pathname).toBe('/en/overview');

      jest.clearAllMocks();

      // Merchant redirected away from /en/overview/
      const merchantAdminReq = mockRequest('/en/overview/', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(merchantAdminReq);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const merchantRedirect = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(merchantRedirect.pathname).toBe('/en/dashboard');

      jest.clearAllMocks();

      // Onboarded merchant redirected away from /en/onboarding/
      const onboardedReq = mockRequest(
        '/en/onboarding/',
        { auth_token: 'valid_token', user_role: 'merchant', merchant_onboarded: 'true' }
      );
      middleware(onboardedReq);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const onboardedRedirect = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
      expect(onboardedRedirect.pathname).toBe('/en/dashboard');
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
