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
  "/audit",
  "/batches",
  "/webhooks",
  "/assets",
  "/alerts",
]);
const ADMIN_PREFIXES = ["/admin", "/merchants/kyb", "/security"];

/** Exact paths and prefixes that belong to the merchant app shell. */
const MERCHANT_EXACT = new Set<string>([
  "/onboarding",
  "/dashboard",
  "/transactions",
  "/wallet",
  "/fx",
  "/developers",
  "/settings",
  "/payment-links",
  "/notifications",
]);
const MERCHANT_PREFIXES = [
  "/payments",
  "/settlement",
  "/settings",
  "/payment-links",
  "/notifications",
];

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname;
}

function matchesSegmentPrefix(pathname: string, prefix: string): boolean {
  const p = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export function isAdminRoute(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return (
    ADMIN_EXACT.has(normalized) ||
    ADMIN_PREFIXES.some((p) => matchesSegmentPrefix(normalized, p))
  );
}

export function isMerchantRoute(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return (
    MERCHANT_EXACT.has(normalized) ||
    MERCHANT_PREFIXES.some((p) => matchesSegmentPrefix(normalized, p))
  );
}
