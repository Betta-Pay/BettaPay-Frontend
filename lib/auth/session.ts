import type { NextRequest } from 'next/server';
import type { User, Role } from '@/lib/types';
import { stripLocalePrefix } from '@/lib/i18n/locales';

/**
 * Single source of truth for BettaPay session cookie contract.
 * Used by middleware, hooks (useSessionCheck), store, and e2e helpers
 * to avoid drift when tokens rotate (POST /api/auth/session sets both).
 */

export const AUTH_TOKEN_COOKIE = 'auth_token' as const;
export const USER_ROLE_COOKIE = 'user_role' as const;
export const MERCHANT_ONBOARDED_COOKIE = 'merchant_onboarded' as const;
export const CSRF_COOKIE = 'csrf_token' as const;

/** Persisted localStorage key for zustand auth store (bp-session). */
export const BP_SESSION_KEY = 'bp-session' as const;

export interface Session {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
}

export type SessionCheckResponse = { user: User; token: string };

function normalizeRole(raw?: string | null): Role | null {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'admin') return 'admin';
  if (v === 'merchant') return 'merchant';
  return null;
}

/**
 * Derive Session from a NextRequest cookie jar (middleware) or any
 * object with a `get(name)` that returns `{value}`.
 * Valid session requires a non-empty auth_token; role may be null (defaults to merchant on hydrate).
 */
export function getSessionFromCookies(
  cookies: Pick<NextRequest['cookies'], 'get'>,
): Session {
  const token = cookies.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const rawRole = cookies.get(USER_ROLE_COOKIE)?.value ?? null;
  const role = normalizeRole(rawRole);
  const isAuthenticated = !isJwtExpiredOrInvalid(token);
  // User not decoded here — hydrate via GET /api/auth/session in the hook
  return { user: null, token: isAuthenticated ? token : null, role, isAuthenticated };
}

/** Guard used by middleware and hooks — same predicate. */
export function isSessionValid(session: Session): boolean {
  return session.isAuthenticated && !isJwtExpiredOrInvalid(session.token);
}

/** Route classification shared by middleware and client flash guard. */
export function isPublicRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return (
    path === '/' ||
    path.startsWith('/pay') ||
    path === '/contact' ||
    path.startsWith('/docs') ||
    path.startsWith('/privacy') ||
    path.startsWith('/terms') ||
    path.startsWith('/fiat-settlements') ||
    path.startsWith('/pricing') ||
    path.startsWith('/about') ||
    path.startsWith('/guides') ||
    path.startsWith('/sdks') ||
    path.startsWith('/status')
  );
}
export function isAuthRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return path.startsWith('/auth');
}

/**
 * Static marketing / documentation routes that render without any
 * authenticated-app machinery — no React Query, no auth/wallet stores, no
 * axios. `ConditionalAppProviders` uses this to skip mounting `AppProviders`
 * for these pages so they don't ship the app bundle (issue #584).
 *
 * This is deliberately stricter than `isPublicRoute`: `/pay` and
 * `/fiat-settlements` are public but render React Query data islands, so they
 * are NOT listed here.
 */
const MARKETING_ROUTE_PREFIXES = [
  '/about',
  '/pricing',
  '/status',
  '/contact',
  '/terms',
  '/privacy',
  '/guides',
  '/sdks',
  '/docs',
] as const;

export function isMarketingRoute(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  if (path === '/') return true;
  return MARKETING_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Shape persisted in localStorage bp-session (zustand partialize). */
export interface PersistedAuthState {
  isLoggedIn: boolean;
}

/**
 * Safely extract an exact cookie value from a cookie string (`document.cookie`).
 * Avoids false-positive substring matches when cookie names or values share substrings.
 */
export function getCookieValue(cookieString: string | undefined | null, cookieName: string): string | null {
  if (!cookieString || typeof cookieString !== 'string') return null;
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key === cookieName) {
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

/**
 * Single source of truth for checking onboarding completion status across client surfaces.
 * Reads consolidated key `bp_onboarded` from localStorage or `merchant_onboarded` cookie.
 */
export function isOnboardingCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lsVal = localStorage.getItem('bp_onboarded');
    const legacyVal = localStorage.getItem('onboardingCompleted');
    if (lsVal === 'true' || legacyVal === 'true') return true;

    const cookieVal = getCookieValue(document.cookie, MERCHANT_ONBOARDED_COOKIE);
    return cookieVal === 'true';
  } catch {
    return false;
  }
}

/**
 * Single source of truth for persisting onboarding completion status.
 * Writes `bp_onboarded` to localStorage, removes redundant legacy keys, and sets the cookie.
 */
export function setOnboardingCompleted(completed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const value = completed ? 'true' : 'false';
    localStorage.setItem('bp_onboarded', value);
    localStorage.removeItem('onboardingCompleted');
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    document.cookie = `${MERCHANT_ONBOARDED_COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`;
  } catch {
    // localStorage / cookie access error fallback
  }
}
