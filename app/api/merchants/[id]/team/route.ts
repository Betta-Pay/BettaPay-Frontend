import { NextResponse } from "next/server";
import { USER_ROLE_COOKIE } from "@/lib/auth/session";
import {
  inviteTeamMember,
  listTeamMembers,
  type TeamErrorCode,
} from "@/lib/services/merchantService";

export const runtime = "nodejs";

/**
 * `/api/merchants/:id/team` (issue #465).
 *
 * GET  — list members + the recent audit trail.
 * POST — invite a member (email + role) as a pending entry.
 *
 * HTTP only: the permission gate, payload validation and the invite itself
 * live in `lib/services/merchantService.ts`; this file maps failures to status
 * codes.
 */

const STATUS_BY_CODE: Record<TeamErrorCode, number> = {
  invalid_body: 400,
  forbidden: 403,
  conflict: 409,
};

function actorFrom(req: Request): string {
  return req.headers.get("x-actor-email") ?? "owner@bettapay.com";
}

/** Raw `user_role` cookie value handed to the service's `team.manage` gate. */
function roleFrom(req: Request): string | null {
  return req.headers.get("cookie")?.match(new RegExp(`${USER_ROLE_COOKIE}=([^;]+)`))?.[1] ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json(listTeamMembers(params.id));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = inviteTeamMember({
    merchantId: params.id,
    actor: actorFrom(req),
    role: roleFrom(req),
    body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: STATUS_BY_CODE[result.code] },
    );
  }
  return NextResponse.json({ member: result.member }, { status: 201 });
}
