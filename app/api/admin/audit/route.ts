/**
 * GET /api/admin/audit
 *
 * Filterable, cursor-paginated audit trail (admin only).
 *   ?entityType=MERCHANT   exact entity type
 *   ?action=KYB_*          exact action, or PREFIX_* wildcard
 *   ?actor=admin           substring of actorId
 *   ?ip=102.89             substring of ipAddress
 *   ?from=ISO&to=ISO       inclusive createdAt range
 *   ?q=text                free text over action, entity, actor, ip and changes
 *   ?cursor=...&limit=25   cursor pagination, newest first (limit <= 200)
 *   ?entityId=...          exact entity id
 *   ?format=csv            the whole filtered set as CSV (ignores cursor/limit)
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { queryAudit, listAllMatching, decodeCursor } from "@/lib/audit/store";
import { auditToCsv } from "@/lib/audit/csv";
import type { AuditFilters } from "@/lib/audit/types";

const NO_STORE = { "Cache-Control": "no-store" };

function parseDate(v: string | null): string | null | "invalid" {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? "invalid" : new Date(t).toISOString();
}

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const p = new URL(req.url).searchParams;
  const from = parseDate(p.get("from"));
  const to = parseDate(p.get("to"));
  if (from === "invalid" || to === "invalid") {
    return NextResponse.json({ error: "from/to must be valid dates" }, { status: 400, headers: NO_STORE });
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: "from must be before to" }, { status: 400, headers: NO_STORE });
  }

  const limitRaw = p.get("limit");
  const limit = limitRaw === null ? 25 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return NextResponse.json({ error: "limit must be an integer from 1 to 200" }, { status: 400, headers: NO_STORE });
  }
  const cursor = p.get("cursor");
  if (cursor && !decodeCursor(cursor)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400, headers: NO_STORE });
  }

  const filters: AuditFilters = {
    entityType: p.get("entityType") || undefined,
    entityId: p.get("entityId") || undefined,
    action: p.get("action") || undefined,
    actor: p.get("actor") || undefined,
    ip: p.get("ip") || undefined,
    from: from ?? undefined,
    to: to ?? undefined,
    q: p.get("q")?.trim() || undefined,
  };
  if (p.get("format") === "csv") {
    const rows = listAllMatching(filters);
    return new NextResponse(auditToCsv(rows), {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json(queryAudit(filters, { cursor, limit }), { headers: NO_STORE });
}
