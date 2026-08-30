import type { NextRequest } from "next/server";
import type { AppRole } from "./routeAccess";

/**
 * Server-side role check for route handlers (issue #492).
 *
 * The middleware's redirect trusts the readable `user_role` cookie for UX,
 * but a route that returns privileged data must verify the role against the
 * **backend session**, not that cookie. This helper POSTs the `auth_token`
 * to the auth service and returns its confirmed role; it never falls back to
 * the client-controlled cookie for the allow decision.
 *
 * Usage in an admin route handler:
 *
 *   const check = await requireRole(req, "admin");
 *   if (!check.ok) return NextResponse.json({ error: check.reason }, { status: check.status });
 */
export interface RoleCheckResult {
  ok: boolean;
  role: AppRole | null;
  status: 401 | 403 | 200;
  reason?: string;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export async function requireRole(
  req: NextRequest | Request,
  required: AppRole,
): Promise<RoleCheckResult> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const authToken = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];

  if (!authToken) {
    return { ok: false, role: null, status: 401, reason: "not authenticated" };
  }

  const base = apiBase();
  const isSelfLoop = base.includes("localhost:3000") || base.includes("127.0.0.1:3000");

  let confirmedRole: AppRole | null = null;

  if (!isSelfLoop) {
    try {
      const res = await fetch(`${base}/api/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: cookieHeader },
        body: JSON.stringify({ token: authToken }),
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) {
        return { ok: false, role: null, status: 401, reason: "session rejected" };
      }
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          role?: unknown;
          user?: { role?: unknown };
        };
        const raw = body.role ?? body.user?.role;
        if (raw === "admin" || raw === "merchant") confirmedRole = raw;
      }
    } catch {
      // Auth service unreachable — fail closed for privileged checks.
      return { ok: false, role: null, status: 403, reason: "role could not be verified" };
    }
  } else {
    // Local/mock mode: decode the (already structurally-checked) JWT payload.
    try {
      const payload = JSON.parse(
        Buffer.from(authToken.split(".")[1] ?? "", "base64url").toString("utf8"),
      ) as { role?: unknown };
      if (payload.role === "admin" || payload.role === "merchant") confirmedRole = payload.role;
    } catch {
      confirmedRole = null;
    }
  }

  if (confirmedRole === required) {
    return { ok: true, role: confirmedRole, status: 200 };
  }
  return { ok: false, role: confirmedRole, status: 403, reason: `requires ${required} role` };
}
