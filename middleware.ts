import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureCsrfCookieInMiddleware } from '@/lib/utils/csrf';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const role = request.cookies.get('user_role')?.value;

  // Helper to seed CSRF cookie on every response (allowed in middleware via NextResponse)
  const withCsrf = (response: NextResponse): NextResponse => {
    ensureCsrfCookieInMiddleware(request, response);
    return response;
  };

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  // Public marketing/reference surfaces. The API documentation in particular
  // must be readable by anonymous developers evaluating BettaPay.
  const isPublicPage = request.nextUrl.pathname === '/' ||
                       request.nextUrl.pathname.startsWith('/pay') ||
                       request.nextUrl.pathname === '/contact' ||
                       request.nextUrl.pathname.startsWith('/docs') ||
                       request.nextUrl.pathname.startsWith('/privacy') ||
                       request.nextUrl.pathname.startsWith('/terms') ||
                       request.nextUrl.pathname.startsWith('/fiat-settlements') ||
                       request.nextUrl.pathname.startsWith('/pricing') ||
                       request.nextUrl.pathname.startsWith('/about') ||
                       request.nextUrl.pathname.startsWith('/guides') ||
                       request.nextUrl.pathname.startsWith('/sdks') ||
                       request.nextUrl.pathname.startsWith('/status');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin') ||
                       request.nextUrl.pathname === '/overview' ||
                       request.nextUrl.pathname === '/merchants' ||
                       request.nextUrl.pathname.startsWith('/merchants/kyb') ||
                       request.nextUrl.pathname === '/anchors' ||
                       request.nextUrl.pathname === '/fx-management' ||
                       request.nextUrl.pathname === '/compliance';

  // Allow public access to landing page and payment links
  if (isPublicPage) {
    return withCsrf(NextResponse.next());
  }

  // If trying to access auth pages while logged in, redirect to dashboard
  // Exception: 2FA page is always accessible after partial login
  if (isAuthPage) {
    if (token) {
      if (role === 'admin') {
        return withCsrf(NextResponse.redirect(new URL('/overview', request.url)));
      }
      return withCsrf(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    return withCsrf(NextResponse.next());
  }

  // Require auth for everything else
  if (!token) {
    return withCsrf(NextResponse.redirect(new URL('/auth/login', request.url)));
  }

  // Redirect onboarded merchants away from onboarding page
  const isOnboarded = request.cookies.get('merchant_onboarded')?.value === 'true';
  if (request.nextUrl.pathname === '/onboarding' && isOnboarded) {
    return withCsrf(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  // Role-based protection
  if (isAdminRoute && role !== 'admin') {
    return withCsrf(NextResponse.redirect(new URL('/dashboard', request.url))); // redirect merchants from admin
  }

  // Protect merchant routes from admins
  const isMerchantRoute = request.nextUrl.pathname === '/onboarding' ||
                          request.nextUrl.pathname === '/dashboard' ||
                          request.nextUrl.pathname.startsWith('/payments') ||
                          request.nextUrl.pathname === '/transactions' ||
                          request.nextUrl.pathname.startsWith('/settlement') ||
                          request.nextUrl.pathname === '/wallet' ||
                          request.nextUrl.pathname === '/fx' ||
                          request.nextUrl.pathname === '/developers' ||
                          request.nextUrl.pathname === '/settings';

  if (isMerchantRoute && role === 'admin') {
    return withCsrf(NextResponse.redirect(new URL('/overview', request.url)));
  }

  return withCsrf(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js / manifest.webmanifest / icons / logo.png (PWA static assets —
     *   must never be redirected so the service worker can install and the
     *   install prompt can resolve its manifest)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons|logo.png).*)',
  ],
};
