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

  /** Helper: build a redirect URL that preserves the active locale prefix. */
  const redirectUrl = (pathname: string) =>
    new URL(localePath(activeLocale, pathname), request.url);

  const isAuthPage = internalPathname.startsWith('/auth');

  // Public marketing/reference surfaces. The API documentation in particular
  // must be readable by anonymous developers evaluating BettaPay.
  const isPublicPage = internalPathname === '/' ||
                       internalPathname.startsWith('/pay') ||
                       internalPathname === '/contact' ||
                       internalPathname.startsWith('/docs') ||
                       internalPathname.startsWith('/privacy') ||
                       internalPathname.startsWith('/terms') ||
                       internalPathname.startsWith('/fiat-settlements') ||
                       internalPathname.startsWith('/pricing') ||
                       internalPathname.startsWith('/about') ||
                       internalPathname.startsWith('/guides') ||
                       internalPathname.startsWith('/sdks') ||
                       internalPathname.startsWith('/status');

  const isAdminRoute = isAdminPath(internalPathname);

  // Allow public access to landing page and payment links
  if (isPublicPage) {
    return withCsrf(
      NextResponse.rewrite(new URL(internalPathname, request.url)),
    );
  }

  // If trying to access auth pages while logged in, redirect to dashboard
  if (isAuthPage) {
    if (token) {
      if (role === 'admin') {
        return withCsrf(NextResponse.redirect(redirectUrl('/overview')));
      }
      return withCsrf(NextResponse.redirect(redirectUrl('/dashboard')));
    }
    return withCsrf(
      NextResponse.rewrite(new URL(internalPathname, request.url)),
    );
  }

  // Require auth for everything else
  if (!token) {
    return withCsrf(NextResponse.redirect(redirectUrl('/auth/login')));
  }

  // Redirect onboarded merchants away from onboarding page
  const isOnboarded = request.cookies.get('merchant_onboarded')?.value === 'true';
  if (internalPathname === '/onboarding' && isOnboarded) {
    return withCsrf(NextResponse.redirect(redirectUrl('/dashboard')));
  }

  // Role-based protection
  if (isAdminRoute && role !== 'admin') {
    return withCsrf(NextResponse.redirect(redirectUrl('/dashboard')));
  }

  // Protect merchant routes from admins
  const isMerchantRoute = isMerchantPath(internalPathname);

  if (isMerchantRoute && role === 'admin') {
    return withCsrf(NextResponse.redirect(redirectUrl('/overview')));
  }

  return withCsrf(
    NextResponse.rewrite(new URL(internalPathname, request.url)),
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
