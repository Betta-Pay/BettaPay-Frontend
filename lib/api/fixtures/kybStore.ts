/**
 * In-memory KYB / audit fixture store for the admin API routes.
 *
 * These used to live inside `app/api/admin/merchants/[id]/kyb/route.ts`, but a
 * route module may only export HTTP handlers and route config — Next's
 * generated type checks reject any other export. Both the KYB decision route
 * and the audit explorer read the same singleton, so it lives here instead.
 *
 * A real implementation would write to a database. This in-memory store
 * satisfies the acceptance criteria (visible in the audit explorer) for this
 * frontend-only environment without requiring a running backend.
 */

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
