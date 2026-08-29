/**
 * Centralised route-access rules (issue #492).
 *
 * The admin/merchant route lists were duplicated inside `middleware.ts` with
 * no shared definition, so a server route handler that needs to independently
 * re-check the role had nothing to import. This module is the single source
 * of truth — used by the middleware *and* by `requireRole` in route handlers.
 *
 * The middleware gate is a convenience redirect only. It reads a cookie the
 * client can set, so it is **not** a security boundary: every admin route
 * handler and server component that exposes privileged data MUST call
 * `requireRole('admin', ...)` (or an equivalent backend check) itself.
 */

export type AppRole = "admin" | "merchant";

/** Exact paths and path prefixes that require the `admin` role. */
const ADMIN_EXACT = new Set<string>([
  "/overview",
  "/merchants",
  "/anchors",
  "/fx-management",
  "/compliance",
]);
const ADMIN_PREFIXES = ["/admin", "/merchants/kyb"];

/** Exact paths and prefixes that belong to the merchant app shell. */
const MERCHANT_EXACT = new Set<string>([
  "/onboarding",
  "/dashboard",
  "/transactions",
  "/wallet",
  "/fx",
  "/developers",
  "/settings",
]);
const MERCHANT_PREFIXES = ["/payments", "/settlement", "/settings/"];

export function isAdminRoute(pathname: string): boolean {
  return (
    ADMIN_EXACT.has(pathname) ||
    ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p))
  );
}

export function isMerchantRoute(pathname: string): boolean {
  return (
    MERCHANT_EXACT.has(pathname) ||
    MERCHANT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))
  );
}
