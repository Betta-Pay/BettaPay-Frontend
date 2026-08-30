import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/utils/csrf';

/**
 * GET /api/auth/csrf
 *
 * Bootstrap endpoint for the CSRF double-submit cookie pattern.
 *
 * Call this once before the React app hydrates (e.g. from the root layout
 * server component) to guarantee the `csrf_token` cookie is present.
 * Subsequent calls are cheap: if a valid token is already in the request
 * cookies the same value is echoed back so the existing cookie is refreshed
 * rather than rotated unnecessarily.
 *
 * The token IS rotated on every new session (login sets a fresh one via
 * POST /api/auth/session) and on every token refresh (POST /api/auth/refresh).
 *
 * Cookie attributes:
 *   - SameSite=Strict   — never sent on cross-site navigations
 *   - Secure            — HTTPS-only in production
 *   - non-HttpOnly      — JS must read the value for the double-submit header
 *   - Max-Age=86400     — 24 h; rotated on login/refresh
 */
export async function GET(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  // `?rotate=1` forces a brand-new token even when a valid one exists — used
  // by the client at identity-change moments (e.g. right after logout) so a
  // token from the previous session cannot linger (issue #486).
  const forceRotate = req.nextUrl.searchParams.get('rotate') === '1';

  // Otherwise re-use an existing valid token so we don't invalidate in-flight
  // requests.
  const existing = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const token =
    !forceRotate && existing && existing.length === 64 ? existing : generateCsrfToken();

  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    'Max-Age=86400',
    ...(isProduction ? ['Secure'] : []),
  ];

  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        // Prevent the browser / CDN from caching the CSRF response.
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        'Set-Cookie': cookieParts.join('; '),
      },
    }
  );

  return res;
}
