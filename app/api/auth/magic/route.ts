import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeMagicToken } from "@/lib/auth/magicLink";
import { AUTH_TOKEN_COOKIE, USER_ROLE_COOKIE } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(1) });

const ERROR_COPY: Record<string, string> = {
  invalid: "This sign-in link is not valid. Request a new one.",
  expired: "This sign-in link has expired. Request a new one.",
  used: "This sign-in link has already been used. Request a new one.",
};

/**
 * POST /api/auth/magic — verifies a magic-link token server-side and, on
 * success, issues a merchant session by setting the same cookies
 * `POST /api/auth/session` uses. The token is single-use: a replay returns a
 * clear "used" error the callback page turns into a resend prompt (issue
 * #466). Wallet and password login paths are untouched.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const result = consumeMagicToken(parsed.data.token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: ERROR_COPY[result.error] },
      { status: result.error === "invalid" ? 404 : 410 },
    );
  }

  // Mock session token — in production, exchange the verified email for a
  // real session with the auth service and store its token here instead.
  const sessionToken = `magic.${Buffer.from(
    JSON.stringify({ sub: result.email, via: "magic-link", iat: Date.now() }),
  ).toString("base64url")}`;

  const res = NextResponse.json({ ok: true, email: result.email, redirectTo: ROUTES.DASHBOARD });
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 60 * 30; // 30 minutes, matching the session route
  res.cookies.set(AUTH_TOKEN_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });
  res.cookies.set(USER_ROLE_COOKIE, "merchant", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });
  return res;
}
