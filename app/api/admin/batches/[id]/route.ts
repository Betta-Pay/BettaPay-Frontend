/**
 * GET /api/admin/batches/:id
 * Batch detail: derived status, real-timestamp timeline, members with
 * per-item status and fully resolved retry (supersededById) chains.
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { getBatch, membersOf } from "@/lib/batches/store";
import { detailBatch } from "@/lib/batches/derive";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const batch = getBatch(params.id);
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ data: detailBatch(batch, membersOf(batch.id)) }, { headers: { "Cache-Control": "no-store" } });
}
