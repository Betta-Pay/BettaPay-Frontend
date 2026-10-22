/** GET /api/admin/settings — every settings section with its version. */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { getSettings } from "@/lib/settings/store";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  return NextResponse.json({ data: getSettings() }, { headers: { "Cache-Control": "no-store" } });
}
