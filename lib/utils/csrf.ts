/**
 * CSRF token utilities for double-submit cookie pattern.
 *
 * The server sets a `csrf_token` cookie (non-HttpOnly so JS can read it).
 * The frontend reads that cookie and sends it back in the `X-CSRF-Token`
 * header on every state-changing request. The backend is responsible for
 * verifying the header value matches the cookie value.
 *
 * Token lifecycle:
 *   1. GET /api/auth/csrf  — bootstraps the cookie before React hydrates
 *      (called from the root server component; no-ops if a valid token exists)
 *   2. POST /api/auth/session — rotates the token on login
 *   3. POST /api/auth/refresh — rotates the token on access-token refresh
 */

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Companion HttpOnly cookie that binds the readable `csrf_token` to the
 * current session (issue #486). It holds `sha256(csrfToken + sessionKey)`
 * where `sessionKey` is derived from the auth token. The backend verifies:
 *   - `X-CSRF-Token` header === `csrf_token` cookie   (double-submit), AND
 *   - `csrf_sid` cookie === sha256(csrf_token + sessionKey)   (binding)
 * so a token minted for a different visitor / a pre-login page on the same
 * browser profile is rejected once a real session exists — a bare random
 * value is no longer sufficient.
 */
export const CSRF_SID_COOKIE_NAME = 'csrf_sid';

// ─── Token length ────────────────────────────────────────────────────────────
// 32 random bytes → 64 hex characters. Used to validate tokens read back from
// cookies (quick sanity check before forwarding as a header value).
export const CSRF_TOKEN_BYTE_LENGTH = 32;
export const CSRF_TOKEN_HEX_LENGTH = CSRF_TOKEN_BYTE_LENGTH * 2; // 64

// ─── Generation ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random CSRF token.
 *
 * Works in all three runtimes:
 *   - Browser         → Web Crypto API (window.crypto.getRandomValues)
 *   - Node.js (Edge)  → Web Crypto API (globalThis.crypto.getRandomValues)
 *   - Node.js (≥15)   → `node:crypto` randomBytes via dynamic import fallback
 */
export function generateCsrfToken(): string {
  // Web Crypto (browser + Edge runtime + Node ≥ 19)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const array = new Uint8Array(CSRF_TOKEN_BYTE_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Synchronous Node.js fallback (Node 15–18 server runtime without Web Crypto)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.randomBytes(CSRF_TOKEN_BYTE_LENGTH).toString('hex');
}

/** A short, stable per-session key derived from the auth token — enough to
 *  differentiate one session from another without storing the token itself. */
export function sessionKeyFromAuthToken(authToken: string | undefined | null): string {
  if (!authToken) return 'anon';
  return authToken.slice(0, 24);
}

/** `sha256(csrfToken + '.' + sessionKey)` as hex. Sync in all runtimes. */
export function deriveCsrfBinding(csrfToken: string, sessionKey: string): string {
  const input = `${csrfToken}.${sessionKey}`;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.createHash('sha256').update(input).digest('hex');
}

/** Set-Cookie for the HttpOnly binding cookie (issue #486). */
export function buildCsrfSidCookieHeader(binding: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${CSRF_SID_COOKIE_NAME}=${binding}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=86400',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

/** HTTP status returned when a state-changing request fails CSRF validation. */
export const CSRF_FAILURE_STATUS = 403;

type CsrfRequestLike = {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
};

export interface CsrfVerifyResult {
  ok: boolean;
  reason?: 'missing-header' | 'missing-cookie' | 'mismatch' | 'binding-mismatch';
}

/**
 * Enforce CSRF for a state-changing request (issue #486). Two checks:
 *
 *  1. **double-submit** — `X-CSRF-Token` header must equal the `csrf_token`
 *     cookie. Blocks a cross-site form POST, which can send the cookie but
 *     not a matching custom header.
 *  2. **session binding** — when an authenticated session exists
 *     (`auth_token` present) the HttpOnly `csrf_sid` cookie must equal
 *     `sha256(csrf_token . sessionKey)`. A `csrf_token` minted for a
 *     different visitor / a pre-login page on the same browser profile
 *     carries the wrong (or no) `csrf_sid`, so it is rejected once a real
 *     session is in play — a bare random value is no longer enough.
 *
 * Pre-login requests (no `auth_token`) only need the double-submit check.
 */
export function verifyCsrfRequest(req: CsrfRequestLike): CsrfVerifyResult {
  const header = req.headers.get(CSRF_HEADER_NAME) ?? req.headers.get(CSRF_HEADER_NAME.toLowerCase());
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!header) return { ok: false, reason: 'missing-header' };
  if (!cookieToken) return { ok: false, reason: 'missing-cookie' };
  if (!timingSafeStringEqual(header, cookieToken)) return { ok: false, reason: 'mismatch' };

  const authToken = req.cookies.get('auth_token')?.value;
  const actualBinding = req.cookies.get(CSRF_SID_COOKIE_NAME)?.value;
  // Enforce the binding whenever a `csrf_sid` exists. A session predating the
  // binding (or one whose sid was cleared) has none yet — fall back to the
  // double-submit check alone rather than lock the user out; login/refresh
  // mints the sid and upgrades them to full protection. Once a sid IS
  // present it must match: a `csrf_token` replayed from another visitor / a
  // pre-login page carries the wrong sid and is rejected.
  if (authToken && actualBinding) {
    const expectedBinding = deriveCsrfBinding(cookieToken, sessionKeyFromAuthToken(authToken));
    if (!timingSafeStringEqual(actualBinding, expectedBinding)) {
      return { ok: false, reason: 'binding-mismatch' };
    }
  }

  return { ok: true };
}

/** Constant-time string compare so a mismatch position isn't observable. */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Expires both CSRF cookies. Call on logout. */
export function buildCsrfClearCookieHeaders(): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? '; Secure' : '';
  return [
    `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Strict${secure}`,
    `${CSRF_SID_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict${secure}`,
  ];
}

// ─── Cookie reading (client-side) ────────────────────────────────────────────

/**
 * Read the CSRF token from `document.cookie`.
 * Returns `null` when called server-side or when the cookie is absent.
 */
export function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) return null;

  const value = decodeURIComponent(match.split('=')[1]);
  // Basic sanity check — reject obviously invalid values before sending as a header.
  return value.length === CSRF_TOKEN_HEX_LENGTH ? value : null;
}

/**
 * Header bag carrying the current CSRF token, for same-origin `fetch` calls
 * to our own Next.js API routes (which now enforce the double-submit check —
 * issue #486). Returns `{}` when no token is readable so callers can spread
 * it unconditionally.
 */
export function csrfHeader(): Record<string, string> {
  const token = getCsrfTokenFromCookie();
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}

/**
 * Force a fresh `csrf_token` cookie from the client (issue #486). Call at
 * identity-change moments that don't already rotate it — notably right after
 * logout, so a token minted during the previous session can't linger.
 * Resolves with the new token, or `null` if the request failed.
 */
export async function rotateCsrfToken(): Promise<string | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    await fetch('/api/auth/csrf?rotate=1', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  return getCsrfTokenFromCookie();
}

// ─── Cookie attributes helper (server-side) ──────────────────────────────────

/**
 * Returns the standard Set-Cookie string for the CSRF token.
 * Centralised here so all API routes stay in sync.
 */
export function buildCsrfCookieHeader(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const parts = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'Path=/',
    'SameSite=Strict',
    'Max-Age=86400',
    ...(isProduction ? ['Secure'] : []),
  ];
  return parts.join('; ');
}

// ─── Server-component bootstrap helper ───────────────────────────────────────

/**
 * `ensureCsrfCookie` is meant to be called inside a Next.js **server component**
 * (e.g. the root layout) to guarantee the CSRF cookie is set before the page
 * HTML is streamed to the client.
 *
 * It reads the current cookie store, and if no valid token is present it sets
 * one directly via the `next/headers` cookies API — no extra HTTP round-trip.
 *
 * Usage (app/layout.tsx):
 *
 *   import { ensureCsrfCookie } from '@/lib/utils/csrf';
 *   // Inside the async server component:
 *   await ensureCsrfCookie();
 *
 * @deprecated Calling this from a Server Component layout triggers
 * `Cookies can only be modified in a Server Action or Route Handler` in
 * Next 14.2+. Prefer `ensureCsrfCookieInMiddleware` in `middleware.ts` which
 * uses `NextRequest`/`NextResponse` (allowed). This function is kept for
 * backwards-compat with `GET /api/auth/csrf` route handlers only.
 */
export async function ensureCsrfCookie(): Promise<void> {
  // Dynamic import so this module stays importable in client bundles without
  // pulling in `next/headers` (which throws in browser/Edge contexts).
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Re-use a valid token to avoid invalidating requests that are already in
  // flight (e.g. during streaming / partial hydration).
  if (existing && existing.length === CSRF_TOKEN_HEX_LENGTH) {
    return;
  }

  const token = generateCsrfToken();
  const isProduction = process.env.NODE_ENV === 'production';

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 86400,
    httpOnly: false, // Must be readable by JS for the double-submit header
  });
}

// ─── Middleware helper (NextRequest/NextResponse) ────────────────────────────

/**
 * Middleware-safe CSRF bootstrap. Uses `NextRequest.cookies` (read) and
 * `NextResponse.cookies.set` (write) which are allowed in `middleware.ts`.
 * Call this at the top of `middleware` before any redirects so every
 * response seeds the cookie.
 */
export function ensureCsrfCookieInMiddleware(
  request: { cookies: { get(name: string): { value: string } | undefined } },
  response: { cookies: { set(name: string, value: string, opts: Record<string, unknown>): void } },
): void {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing && existing.length === CSRF_TOKEN_HEX_LENGTH) {
    return;
  }
  const token = generateCsrfToken();
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 86400,
    httpOnly: false,
  });
}
