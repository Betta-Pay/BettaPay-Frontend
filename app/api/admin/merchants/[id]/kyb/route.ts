/**
 * GET  /api/admin/merchants/:id/kyb
 * POST /api/admin/merchants/:id/kyb
 *
 * GET  — Returns a merchant's KYB profile + submitted documents.
 * POST — Accepts an approve/reject decision, persists an AuditLog entry,
 *        and updates kybStatus. Reviewer identity is resolved server-side
 *        from the auth cookie — never from the request body.
 *
 * Role gate: admin only, verified against the backend session (guardAdminApi).
 *
 * The in-memory KYB / audit fixtures live in `lib/api/fixtures/kybStore.ts`:
 * route modules may only export HTTP handlers, and the audit explorer reads
 * the same singleton.
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  auditLog,
  merchantKybStore,
  type AuditLogEntry,
} from "@/lib/api/fixtures/kybStore";

function getReviewerIdFromCookies(): string {
  try {
    const store = cookies();
    return store.get("user_id")?.value ?? "system";
  } catch {
    return "system";
  }
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const profile = merchantKybStore[params.id];
  if (!profile) {
    return NextResponse.json(
      { error: `Merchant ${params.id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { data: profile },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// ─── POST handler (approve / reject decision) ─────────────────────────────────

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const profile = merchantKybStore[params.id];
  if (!profile) {
    return NextResponse.json(
      { error: `Merchant ${params.id} not found` },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { decision, note } = parsed.data;

  // Reviewer identity resolved from the server-side cookie — never from body.
  const reviewerId = getReviewerIdFromCookies();

  // Update merchant KYB status in the mock store.
  profile.kybStatus = decision === "approved" ? "approved" : "rejected";
  profile.reviewedAt = new Date().toISOString();
  profile.reviewedBy = reviewerId;
  profile.rejectionReason = decision === "rejected" ? (note ?? null) : null;

  // Persist AuditLog row (entityType: MERCHANT, action: KYB_REVIEW).
  const auditEntry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entityType: "MERCHANT",
    entityId: params.id,
    action: decision === "approved" ? "KYB_APPROVED" : "KYB_REJECTED",
    reviewerId,
    reviewerEmail: "admin@bettapay.com", // In production, look up from DB
    decision,
    note: note ?? null,
    createdAt: new Date().toISOString(),
  };

  auditLog.push(auditEntry);

  return NextResponse.json(
    {
      data: {
        merchantId: params.id,
        kybStatus: profile.kybStatus,
        auditLogId: auditEntry.id,
        decision,
        reviewedAt: profile.reviewedAt,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
