/** POST /api/admin/alerts/:id/resolve – manually resolve an alert (audited). */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { countUnread, getAlertStore, resolveEvent } from "@/lib/alerts/store";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const store = getAlertStore();
  const event = resolveEvent(store, params.id, "admin");
  if (!event) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  return NextResponse.json(
    { data: event, unreadCount: countUnread(store.events), cursor: String(store.seq) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
