/**
 * GET /api/admin/alerts            – rules, events and unread count
 * GET /api/admin/alerts?since=<n>  – only events changed after cursor <n>
 *
 * Rules are evaluated on every read, so a threshold crossing shows up on the
 * very next poll. Admin-only (guardAdminApi).
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { buildFeed } from "@/lib/alerts/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const since = new URL(request.url).searchParams.get("since");
  return NextResponse.json(buildFeed(since), { headers: { "Cache-Control": "no-store" } });
}
