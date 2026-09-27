import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureCsrfCookieInMiddleware } from '@/lib/utils/csrf';
import { isAdminRoute as isAdminPath, isMerchantRoute as isMerchantPath } from '@/lib/auth/routeAccess';
import { supportedLocales, defaultLocale, LOCALE_COOKIE } from '@/lib/i18n/locales';
import type { Locale } from '@/lib/i18n/locales';

// ─── Locale helpers ──────────────────────────────────────────────────────────

/**
 * Extract a supported locale prefix from the URL pathname, returning the
 * locale and the pathname with the prefix stripped. Returns `null` locale
 * when no supported locale prefix is found.
 */
function extractLocaleFromPathname(pathname: string): { locale: Locale; stripped: string } | null {
  const segments = pathname.split('/');
  // segments[0] is '' (before the leading /)
  const candidate = segments[1];
  if (candidate && supportedLocales.includes(candidate as Locale)) {
    const stripped = '/' + segments.slice(2).join('/');
    return { locale: candidate as Locale, stripped: stripped || '/' };
  }
  return null;
}

/**
 * Detect the preferred locale from the NEXT_LOCALE cookie or the
 * Accept-Language header, falling back to the configured default.
 */
function detectLocaleFromRequest(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    for (const lang of acceptLanguage.split(',')) {
      const base = lang.trim().split(';')[0].split('-')[0].toLowerCase();
      if (supportedLocales.includes(base as Locale)) {
        return base as Locale;
      }
    }
  }

  return defaultLocale;
}

/** Build a locale-prefixed pathname: `/en/dashboard`, `/fr`, etc. */
function localePath(locale: Locale, pathname: string): string {
  return `/${locale}${pathname === '/' ? '' : pathname}`;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

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
  // ── Locale path-based routing ─────────────────────────────────────────────
  const extracted = extractLocaleFromPathname(request.nextUrl.pathname);

  // If the URL already has a locale prefix, strip it for internal routing and
  // persist the preference in a cookie so downstream code (server components,
  // client-side i18n) can resolve the active locale.
  let activeLocale: Locale;
  let internalPathname: string;

  if (extracted) {
    activeLocale = extracted.locale;
    internalPathname = extracted.stripped;
  } else {
    // Bare path — redirect to the locale-prefixed equivalent for SEO and
    // consistency. The locale is inferred from the cookie or Accept-Language.
    activeLocale = detectLocaleFromRequest(request);
    internalPathname = request.nextUrl.pathname;

    const prefixedUrl = request.nextUrl.clone();
    prefixedUrl.pathname = localePath(activeLocale, internalPathname);
    return NextResponse.redirect(prefixedUrl);
  }

  // ── Auth & RBAC (unchanged logic, operates on the stripped path) ──────────
  const token = request.cookies.get('auth_token')?.value;
  const role = request.cookies.get('user_role')?.value;

  const withCsrf = (response: NextResponse): NextResponse => {
    ensureCsrfCookieInMiddleware(request, response);
    // Persist locale so the client and server can both resolve it.
    response.cookies.set(LOCALE_COOKIE, activeLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
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
    return withCsrf(
      NextResponse.rewrite(new URL(internalPathname, request.url)),
    );
  }

  // Everything else in the matcher is a protected route — require a session.
  if (!token) {
    return withCsrf(NextResponse.redirect(redirectUrl('/auth/login')));
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

  return withCsrf(
    NextResponse.rewrite(new URL(internalPathname, request.url)),
  );
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
