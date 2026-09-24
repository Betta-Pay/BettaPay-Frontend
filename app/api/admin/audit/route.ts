/**
 * GET /api/admin/audit
 *
 * Returns the in-memory audit log, with optional filters:
 *   ?action=KYB_APPROVED      — filter by action name
 *   ?action=KYB_*             — wildcard prefix match (e.g. all KYB actions)
 *   ?entityId=merch-001       — filter by entity ID
 *   ?limit=50                 — max rows (default 100)
 *
 * Role gate: admin only.
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { auditLog } from "../merchants/[id]/kyb/route";

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const actionFilter = url.searchParams.get("action"); // e.g. "KYB_*" or "KYB_APPROVED"
  const entityIdFilter = url.searchParams.get("entityId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);

  let entries = [...auditLog].reverse(); // newest first

  // Filter by action — supports wildcard prefix (KYB_*) or exact match
  if (actionFilter) {
    if (actionFilter.endsWith("*")) {
      const prefix = actionFilter.slice(0, -1);
      entries = entries.filter((e) => e.action.startsWith(prefix));
    } else {
      entries = entries.filter((e) => e.action === actionFilter);
    }
  }

  if (entityIdFilter) {
    entries = entries.filter((e) => e.entityId === entityIdFilter);
  }

  return NextResponse.json(
    {
      data: entries.slice(0, limit),
      total: entries.length,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
