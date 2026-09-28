import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ensureCsrfCookieInMiddleware } from '@/lib/utils/csrf';
import { isAdminRoute as isAdminPath, isMerchantRoute as isMerchantPath } from '@/lib/auth/routeAccess';
import { supportedLocales, defaultLocale, LOCALE_COOKIE } from '@/lib/i18n/locales';
import type { Locale } from '@/lib/i18n/locales';
import { ROUTES } from '@/lib/navigation/routes';

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
const AUTH_PATH_PREFIX = ROUTES.AUTH_PREFIX;

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

  /**
   * Redirect helper that keeps the active locale prefix, so a French visitor is
   * never bounced into the English tree.
   */
  const redirectTo = (path: string): NextResponse =>
    withCsrf(NextResponse.redirect(new URL(localePath(activeLocale, path), request.url)));

  // `request.nextUrl.pathname` still carries the locale prefix — every auth
  // check below runs against the locale-stripped path instead.
  const pathname = internalPathname;

  // Public payment links have no auth requirement — bail before the protected
  // checks below so an anonymous payer is never redirected to login.
  if (pathname.startsWith(PAYMENT_PATH_PREFIX)) {
    return withCsrf(NextResponse.rewrite(new URL(internalPathname, request.url)));
  }

  // If trying to access auth pages while logged in, redirect to dashboard
  // Exception: 2FA page is always accessible after partial login
  if (pathname.startsWith(AUTH_PATH_PREFIX)) {
    if (token) {
      return redirectTo(role === 'admin' ? ROUTES.OVERVIEW : ROUTES.DASHBOARD);
    }
    return withCsrf(
      NextResponse.rewrite(new URL(internalPathname, request.url)),
    );
  }

  // Everything else in the matcher is a protected route — require a session.
  if (!token) {
    return redirectTo(ROUTES.LOGIN);
  }

  // Redirect onboarded merchants away from onboarding page
  const isOnboarded = request.cookies.get('merchant_onboarded')?.value === 'true';
  if (pathname === ROUTES.ONBOARDING && isOnboarded) {
    return redirectTo(ROUTES.DASHBOARD);
  }

  // Role-based protection
  if (isAdminPath(pathname) && role !== 'admin') {
    return redirectTo(ROUTES.DASHBOARD); // redirect merchants from admin
  }

  // Protect merchant routes from admins
  if (isMerchantPath(pathname) && role === 'admin') {
    return redirectTo(ROUTES.OVERVIEW);
  }

  return withCsrf(
    NextResponse.rewrite(new URL(internalPathname, request.url)),
  );
}

/*
 * The matcher below is repeated once per supported locale (`/en/dashboard`,
 * `/fr/dashboard`, ...). Those entries have to be spelled out as literals:
 * Next statically analyses `config.matcher` at build time and silently falls
 * back to matching *every* route when it meets anything it cannot evaluate
 * (a spread, a function call, an interpolated template string), which would
 * undo the allow-list from issue #738. Keep them in sync with `supportedLocales`
 * in `lib/i18n/locales.ts`.
 *
 * Why they exist at all: every allow-listed route also has a locale-prefixed
 * twin, because the middleware redirects bare paths to their localized form.
 * The prefixed URL must match the matcher too, otherwise that redirect target
 * would skip the middleware and 404 instead of being rewritten back onto the
 * prefix-less route.
 */
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
    // Locale-prefixed twins (`/en/dashboard`, `/fr/auth/login`, ...).
    '/en/auth/:path*',
    '/en/onboarding/:path*',
    '/en/dashboard/:path*',
    '/en/transactions/:path*',
    '/en/wallet/:path*',
    '/en/fx/:path*',
    '/en/developers/:path*',
    '/en/settings/:path*',
    '/en/payments/:path*',
    '/en/settlement/:path*',
    '/en/payment-links/:path*',
    '/en/notifications/:path*',
    '/en/overview/:path*',
    '/en/merchants/:path*',
    '/en/anchors/:path*',
    '/en/fx-management/:path*',
    '/en/compliance/:path*',
    '/en/admin/:path*',
    '/en/pay/:path*',
    '/fr/auth/:path*',
    '/fr/onboarding/:path*',
    '/fr/dashboard/:path*',
    '/fr/transactions/:path*',
    '/fr/wallet/:path*',
    '/fr/fx/:path*',
    '/fr/developers/:path*',
    '/fr/settings/:path*',
    '/fr/payments/:path*',
    '/fr/settlement/:path*',
    '/fr/payment-links/:path*',
    '/fr/notifications/:path*',
    '/fr/overview/:path*',
    '/fr/merchants/:path*',
    '/fr/anchors/:path*',
    '/fr/fx-management/:path*',
    '/fr/compliance/:path*',
    '/fr/admin/:path*',
    '/fr/pay/:path*',
    '/pt/auth/:path*',
    '/pt/onboarding/:path*',
    '/pt/dashboard/:path*',
    '/pt/transactions/:path*',
    '/pt/wallet/:path*',
    '/pt/fx/:path*',
    '/pt/developers/:path*',
    '/pt/settings/:path*',
    '/pt/payments/:path*',
    '/pt/settlement/:path*',
    '/pt/payment-links/:path*',
    '/pt/notifications/:path*',
    '/pt/overview/:path*',
    '/pt/merchants/:path*',
    '/pt/anchors/:path*',
    '/pt/fx-management/:path*',
    '/pt/compliance/:path*',
    '/pt/admin/:path*',
    '/pt/pay/:path*',
    '/sw/auth/:path*',
    '/sw/onboarding/:path*',
    '/sw/dashboard/:path*',
    '/sw/transactions/:path*',
    '/sw/wallet/:path*',
    '/sw/fx/:path*',
    '/sw/developers/:path*',
    '/sw/settings/:path*',
    '/sw/payments/:path*',
    '/sw/settlement/:path*',
    '/sw/payment-links/:path*',
    '/sw/notifications/:path*',
    '/sw/overview/:path*',
    '/sw/merchants/:path*',
    '/sw/anchors/:path*',
    '/sw/fx-management/:path*',
    '/sw/compliance/:path*',
    '/sw/admin/:path*',
    '/sw/pay/:path*',
  ],
};
