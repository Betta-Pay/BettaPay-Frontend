import { middleware, config } from '../middleware';

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
    } as any;
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
    const matcherPattern = config.matcher[0];
    const isExcludedByPattern = (path: string) => {
      // Mirror of the matcher in middleware.ts. Kept next to the string equality
      // assertion so both stay in sync.
      const testRegex =
        /^\/((?!api|_next\/static|_next\/image|favicon\.ico|sw\.js|manifest\.webmanifest|icons|logo\.png).*)$/;
      return !testRegex.test(path);
    };

    it('should match the expected paths and exclude api, static files, and PWA assets', () => {
      expect(matcherPattern).toBe(
        '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons|logo.png).*)'
      );

      expect(isExcludedByPattern('/api/auth/session')).toBe(true);
      expect(isExcludedByPattern('/_next/static/chunks/main.js')).toBe(true);
      expect(isExcludedByPattern('/_next/image?url=logo.png')).toBe(true);
      expect(isExcludedByPattern('/favicon.ico')).toBe(true);
      // PWA assets must never be redirected so the service worker can install
      // and the manifest/icons resolve for the install prompt.
      expect(isExcludedByPattern('/sw.js')).toBe(true);
      expect(isExcludedByPattern('/manifest.webmanifest')).toBe(true);
      expect(isExcludedByPattern('/icons/icon-192.png')).toBe(true);
      expect(isExcludedByPattern('/logo.png')).toBe(true);

      expect(isExcludedByPattern('/dashboard')).toBe(false);
      expect(isExcludedByPattern('/overview')).toBe(false);
      expect(isExcludedByPattern('/pay/link_1')).toBe(false);
    });
  });
});
