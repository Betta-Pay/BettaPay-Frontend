import { NextResponse } from "next/server";
import { requireRoleFromCookies } from "./requireRole";

/**
 * RBAC gate for every `app/api/admin/*` handler (issue #779).
 *
 * The role is confirmed against the backend session for the `auth_token`
 * cookie — never the client-writable `user_role` cookie. Call it before any
 * read or mutation:
 *
 *   const denied = await guardAdminApi();
 *   if (denied) return denied;
 *
 * Returns `null` when the caller is an admin, otherwise a JSON error response:
 * 401 without a valid session, 403 for any non-admin role (e.g. merchants).
 */
export async function guardAdminApi(): Promise<NextResponse | null> {
  const check = await requireRoleFromCookies("admin");
  if (check.ok) return null;
  return NextResponse.json(
    { error: check.status === 401 ? "Unauthorized" : "Forbidden" },
    { status: check.status, headers: { "Cache-Control": "no-store" } },
  );
}
