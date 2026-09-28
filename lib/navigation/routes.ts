/**
 * Single source of truth for the app's route paths.
 *
 * Auth redirects used to be hardcoded as string literals scattered across
 * `app/api/auth`, client hooks, the axios interceptors and middleware — a typo
 * in one of them silently misdirected a login/expiry flow. Anything that needs
 * to point at a page should reference these constants instead (issue #742).
 */
export const ROUTES = {
  /** Landing page. */
  HOME: '/',
  /** Auth pages. */
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  MAGIC_LINK: '/auth/magic',
  /** Authenticated surfaces (role-dependent). */
  OVERVIEW: '/overview',
  DASHBOARD: '/dashboard',
  ONBOARDING: '/onboarding',
  /** Shared prefix for every `/auth/*` page — used for `startsWith` checks. */
  AUTH_PREFIX: '/auth',
} as const;

export type RouteName = keyof typeof ROUTES;