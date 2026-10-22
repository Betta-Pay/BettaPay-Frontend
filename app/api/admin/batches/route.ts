/**
 * GET /api/admin/batches?cursor&limit&asset&status
 * Admin-only listing of SettlementBatch records with derived status.
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { listBatches } from "@/lib/batches/store";

export const runtime = "nodejs";

const STATUSES = ["created", "processing", "completed", "completed_with_failures", "failed"];

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw === null ? 20 : Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "limit must be an integer from 1 to 100" }, { status: 400 });
  }
  const status = url.searchParams.get("status") || undefined;
  if (status && !STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const page = listBatches({
    asset: url.searchParams.get("asset") || undefined,
    status,
    cursor: url.searchParams.get("cursor"),
    limit,
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
}
