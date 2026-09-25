import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureCsrfCookieInMiddleware } from '@/lib/utils/csrf';
import { isAdminRoute as isAdminPath, isMerchantRoute as isMerchantPath } from '@/lib/auth/routeAccess';

/**
 * Prefix for the auth surfaces (login, magic link, ...). Authenticated
 * visitors get bounced to their app shell; anonymous visitors pass through.
 */
const AUTH_PATH_PREFIX = '/auth';

/**
 * Public interactive surface for payment links. Kept inside the matcher solely
 * so the CSRF double-submit cookie is seeded before an unauthenticated payment
 * submission POST reaches the backend (issue #738). No auth is evaluated here.
 */
const PAYMENT_PATH_PREFIX = '/pay';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  // NOTE (issue #492): `user_role` is a *hint* used only for redirect UX. It
  // is set HttpOnly by the auth routes but the middleware still treats it as
  // untrusted — the real gate is `requireRole()` in each admin route handler
  // / server component. A forged `user_role=admin` gets redirected here but
  // is rejected the moment it hits a privileged handler.
  const role = request.cookies.get('user_role')?.value;

  // Helper to seed CSRF cookie on every response (allowed in middleware via NextResponse)
  const withCsrf = (response: NextResponse): NextResponse => {
    ensureCsrfCookieInMiddleware(request, response);
    return response;
  };

  const pathname = request.nextUrl.pathname;

  // Public payment links have no auth requirement — bail before the protected
  // checks below so an anonymous payer is never redirected to login.
  if (pathname.startsWith(PAYMENT_PATH_PREFIX)) {
    return withCsrf(NextResponse.next());
  }

  // If trying to access auth pages while logged in, redirect to dashboard
  // Exception: 2FA page is always accessible after partial login
  if (pathname.startsWith(AUTH_PATH_PREFIX)) {
    if (token) {
      return withCsrf(NextResponse.redirect(new URL(role === 'admin' ? '/overview' : '/dashboard', request.url)));
    }
    return withCsrf(NextResponse.next());
  }

  // Everything else in the matcher is a protected route — require a session.
  if (!token) {
    return withCsrf(NextResponse.redirect(new URL('/auth/login', request.url)));
  }

  // Redirect onboarded merchants away from onboarding page
  const isOnboarded = request.cookies.get('merchant_onboarded')?.value === 'true';
  if (pathname === '/onboarding' && isOnboarded) {
    return withCsrf(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  // Role-based protection
  if (isAdminPath(pathname) && role !== 'admin') {
    return withCsrf(NextResponse.redirect(new URL('/dashboard', request.url))); // redirect merchants from admin
  }

  // Protect merchant routes from admins
  if (isMerchantPath(pathname) && role === 'admin') {
    return withCsrf(NextResponse.redirect(new URL('/overview', request.url)));
  }

  return withCsrf(NextResponse.next());
}

export const config = {
  /*
   * Positive allow-list of routes that need authentication evaluation. The
   * middleware now only runs here instead of on every non-static request:
   * static assets, API routes, the homepage and the marketing/reference pages
   * bypass it entirely (issue #738).
   *
   * `/merchants/kyb` and the `/settings/` prefix are covered by the broader
   * `/merchants/:path*` and `/settings/:path*` entries respectively.
   */
  matcher: [
    // Auth surfaces
    '/auth/:path*',
    // Merchant app shell + onboarding
    '/onboarding/:path*',
    '/dashboard/:path*',
    '/transactions/:path*',
    '/wallet/:path*',
    '/fx/:path*',
    '/developers/:path*',
    '/settings/:path*',
    '/payments/:path*',
    '/settlement/:path*',
    '/payment-links/:path*',
    '/notifications/:path*',
    // Admin app shell
    '/overview/:path*',
    '/merchants/:path*',
    '/anchors/:path*',
    '/fx-management/:path*',
    '/compliance/:path*',
    '/admin/:path*',
    // Public interactive: payment links (CSRF seed, see PAYMENT_PATH_PREFIX)
    '/pay/:path*',
  ],
};
