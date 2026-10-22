/** GET /api/admin/settings/history — latest SETTINGS_UPDATE audit entries. */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { queryAudit } from "@/lib/audit/store";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const page = queryAudit({ action: "SETTINGS_UPDATE" }, { limit: 10 });
  return NextResponse.json({ data: page.data, total: page.total }, { headers: { "Cache-Control": "no-store" } });
}
