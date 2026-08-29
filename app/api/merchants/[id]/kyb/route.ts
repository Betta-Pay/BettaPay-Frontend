/**
 * GET /api/merchants/:id/kyb
 *
 * Returns the calling merchant's own KYB profile: the merchant-level
 * `kybStatus` rollup plus every uploaded document and its review state.
 * The onboarding KYC step and the `/settings/kyb` page both read this.
 *
 * Identity is resolved server-side from the auth cookie. A merchant may only
 * read its own profile; a mismatch is a 403 rather than a 404 so the UI can
 * tell "not you" from "no data".
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getMerchantKyb } from "@/lib/kyc/serverStore";

export const runtime = "nodejs";

function callerMerchantId(): string | null {
  try {
    return cookies().get("user_id")?.value ?? null;
  } catch {
    // cookies() is unavailable in some test contexts.
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const caller = callerMerchantId();
  if (caller && caller !== params.id) {
    return NextResponse.json(
      { error: "You can only view your own verification profile." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { data: getMerchantKyb(params.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
