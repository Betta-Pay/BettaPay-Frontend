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
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { cookies } from "next/headers";
import { z } from "zod";

function getReviewerIdFromCookies(): string {
  try {
    const store = cookies();
    return store.get("user_id")?.value ?? "system";
  } catch {
    return "system";
  }
}

// ─── In-memory AuditLog store ─────────────────────────────────────────────────
// A real implementation would write to a database. This in-memory store
// satisfies the acceptance criteria (visible in the audit explorer) for this
// frontend-only environment without requiring a running backend.

export interface AuditLogEntry {
  id: string;
  entityType: "MERCHANT";
  entityId: string;
  action: "KYB_APPROVED" | "KYB_REJECTED" | "KYB_REVIEW";
  reviewerId: string;
  reviewerEmail: string;
  decision: "approved" | "rejected";
  note: string | null;
  createdAt: string;
}

// Shared singleton so the GET /api/admin/audit endpoint can read it too.
export const auditLog: AuditLogEntry[] = [];

// ─── Mock merchant KYB data store ─────────────────────────────────────────────

export interface KybDocument {
  id: string;
  type: "certificate_of_incorporation" | "utility_bill" | "government_id" | "bank_statement" | "tax_id";
  label: string;
  url: string | null;
  uploadedAt: string;
  verified: boolean;
}

export interface MerchantKybProfile {
  merchantId: string;
  businessName: string;
  businessType: string;
  country: string;
  industry: string;
  contactEmail: string;
  phoneNumber: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  websiteUrl: string | null;
  kybStatus: "unverified" | "pending" | "approved" | "rejected";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  documents: KybDocument[];
}

// Mock data — mimics what the backend would return.
export const merchantKybStore: Record<string, MerchantKybProfile> = {
  "merch-001": {
    merchantId: "merch-001",
    businessName: "Apex Digital Solutions Ltd",
    businessType: "corporation",
    country: "Nigeria",
    industry: "FinTech",
    contactEmail: "compliance@apexdigital.ng",
    phoneNumber: "+234-800-123-4567",
    registrationNumber: "RC-1234567",
    taxId: "TIN-987654321",
    websiteUrl: "https://apexdigital.ng",
    kybStatus: "pending",
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [
      {
        id: "doc-001",
        type: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        url: null,
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-002",
        type: "utility_bill",
        label: "Utility Bill (Proof of Address)",
        url: null,
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-003",
        type: "government_id",
        label: "Director Government ID",
        url: null,
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
    ],
  },
  "merch-002": {
    merchantId: "merch-002",
    businessName: "SwiftPay Commerce",
    businessType: "llc",
    country: "Ghana",
    industry: "E-Commerce",
    contactEmail: "kyb@swiftpay.com.gh",
    phoneNumber: "+233-020-555-0100",
    registrationNumber: "GH-LLC-44521",
    taxId: null,
    websiteUrl: "https://swiftpay.com.gh",
    kybStatus: "pending",
    submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [
      {
        id: "doc-004",
        type: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        url: null,
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-005",
        type: "bank_statement",
        label: "Bank Statement (3 months)",
        url: null,
        uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
    ],
  },
  "merch-003": {
    merchantId: "merch-003",
    businessName: "NovaBridge Payments",
    businessType: "sole_proprietor",
    country: "Kenya",
    industry: "Payments",
    contactEmail: "verify@novabridge.co.ke",
    phoneNumber: "+254-712-000-000",
    registrationNumber: "KE-SP-88901",
    taxId: "KRA-PD-12345",
    websiteUrl: null,
    kybStatus: "unverified",
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [
      {
        id: "doc-006",
        type: "government_id",
        label: "Government Issued ID",
        url: null,
        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-007",
        type: "tax_id",
        label: "Tax Identification Number",
        url: null,
        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
    ],
  },
  "merch-004": {
    merchantId: "merch-004",
    businessName: "TrustChain Logistics",
    businessType: "corporation",
    country: "South Africa",
    industry: "Logistics",
    contactEmail: "admin@trustchain.co.za",
    phoneNumber: "+27-11-000-1234",
    registrationNumber: "SA-2022-10045",
    taxId: "SARS-987001",
    websiteUrl: "https://trustchain.co.za",
    kybStatus: "pending",
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [
      {
        id: "doc-008",
        type: "certificate_of_incorporation",
        label: "Certificate of Incorporation",
        url: null,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-009",
        type: "utility_bill",
        label: "Utility Bill",
        url: null,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
      {
        id: "doc-010",
        type: "bank_statement",
        label: "Bank Statement",
        url: null,
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
    ],
  },
  "merch-005": {
    merchantId: "merch-005",
    businessName: "HorizonTech Micro",
    businessType: "individual",
    country: "Rwanda",
    industry: "Technology",
    contactEmail: "horizon@microtech.rw",
    phoneNumber: null,
    registrationNumber: null,
    taxId: null,
    websiteUrl: null,
    kybStatus: "unverified",
    submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    documents: [
      {
        id: "doc-011",
        type: "government_id",
        label: "National ID",
        url: null,
        uploadedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        verified: false,
      },
    ],
  },
};

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
