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
    },
  };
});

import { NextResponse } from 'next/server';

describe('Next.js Middleware Auth & RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (pathname: string, cookies: Record<string, string> = {}) => {
    return {
      url: `http://localhost:3000${pathname}`,
      nextUrl: {
        pathname,
      },
      cookies: {
        get: (name: string) => {
          const value = cookies[name];
          return value ? { value } : undefined;
        },
      },
    } as unknown as NextRequest;
  };

  describe('Unauthenticated redirects', () => {
    it('redirects unauthenticated user to /auth/login for protected route /dashboard', () => {
      const req = mockRequest('/dashboard');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/auth/login', req.url));
    });

    it('redirects unauthenticated user to /auth/login for protected route /overview', () => {
      const req = mockRequest('/overview');
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/auth/login', req.url));
    });
  });

  describe('Authenticated merchant redirects', () => {
    it('allows authenticated merchant to access /dashboard', () => {
      const req = mockRequest('/dashboard', { auth_token: 'valid_token', user_role: 'merchant' });
      const res = middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(res).toEqual(expect.objectContaining({ next: true }));
    });

    it('redirects authenticated merchant to /dashboard when accessing /overview', () => {
      const req = mockRequest('/overview', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/dashboard', req.url));
    });
  });

  describe('Authenticated admin redirects', () => {
    it('allows authenticated admin to access /overview', () => {
      const req = mockRequest('/overview', { auth_token: 'valid_token', user_role: 'admin' });
      const res = middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(res).toEqual(expect.objectContaining({ next: true }));
    });

    it('redirects authenticated admin to /overview when accessing /dashboard', () => {
      const req = mockRequest('/dashboard', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/overview', req.url));
    });
  });

  describe('Auth pages', () => {
    it('allows unauthenticated user to access auth pages', () => {
      const req = mockRequest('/auth/login');
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it('redirects authenticated merchant from auth pages to /dashboard', () => {
      const req = mockRequest('/auth/login', { auth_token: 'valid_token', user_role: 'merchant' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/dashboard', req.url));
    });

    it('redirects authenticated admin from auth pages to /overview', () => {
      const req = mockRequest('/auth/login', { auth_token: 'valid_token', user_role: 'admin' });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL('/overview', req.url));
    });
  });

  describe('Public routes', () => {
    it('allows access to public payment link /pay/link123 without auth', () => {
      const req = mockRequest('/pay/link123');
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
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
