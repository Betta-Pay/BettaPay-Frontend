/**
 * Merchant KYB (Know Your Business) document collection model.
 *
 * The onboarding flow and `/settings/kyb` share these types. `kybStatus` is
 * the merchant-level rollup the backend already exposes on the auth user;
 * `KybDocStatus` is the per-document state a reviewer moves through.
 */

export type KybDocType =
  | 'certificate_of_incorporation'
  | 'proof_of_address'
  | 'government_id'
  | 'bank_statement'
  | 'tax_id';

export interface KybDocTypeMeta {
  type: KybDocType;
  label: string;
  hint: string;
  required: boolean;
}

/** The document slots shown to every merchant, in display order. */
export const KYB_DOC_TYPES: readonly KybDocTypeMeta[] = [
  {
    type: 'certificate_of_incorporation',
    label: 'Certificate of incorporation',
    hint: 'Registration certificate for your business entity.',
    required: true,
  },
  {
    type: 'proof_of_address',
    label: 'Proof of address',
    hint: 'A utility bill or bank letter no older than 3 months.',
    required: true,
  },
  {
    type: 'government_id',
    label: "Director's government ID",
    hint: 'Passport, national ID, or driver’s licence of a director.',
    required: true,
  },
  {
    type: 'bank_statement',
    label: 'Bank statement',
    hint: 'Most recent business bank statement.',
    required: false,
  },
  {
    type: 'tax_id',
    label: 'Tax identification',
    hint: 'Tax registration document (TIN / VAT).',
    required: false,
  },
] as const;

export function kybDocLabel(type: KybDocType): string {
  return KYB_DOC_TYPES.find((d) => d.type === type)?.label ?? type;
}

/** Per-document lifecycle. */
export type KybDocStatus = 'uploaded' | 'under_review' | 'verified' | 'rejected';

/** Merchant-level rollup — matches the value on the auth user object. */
export type KybStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export interface KybDocument {
  id: string;
  type: KybDocType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: KybDocStatus;
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
}

export interface MerchantKyb {
  merchantId: string;
  kybStatus: KybStatus;
  /** Set when the whole submission was rejected; individual docs carry their own. */
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documents: KybDocument[];
}

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const KYB_STATUS_META: Record<KybStatus, { label: string; tone: StatusTone }> = {
  unverified: { label: 'Not started', tone: 'neutral' },
  pending: { label: 'Under review', tone: 'warning' },
  approved: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Action required', tone: 'danger' },
};

export const KYB_DOC_STATUS_META: Record<KybDocStatus, { label: string; tone: StatusTone }> = {
  uploaded: { label: 'Uploaded', tone: 'info' },
  under_review: { label: 'Under review', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

/**
 * Settlement rule configuration is gated until identity verification has at
 * least been submitted (`kycStatus` is at least "pending"). `rejected` still
 * counts — the merchant has engaged and can keep working while they fix docs.
 */
export function isSettlementUnlocked(status: KybStatus | null | undefined): boolean {
  return status === 'pending' || status === 'approved' || status === 'rejected';
}

/** An empty KYB profile for a merchant that has never uploaded anything. */
export function emptyMerchantKyb(merchantId: string): MerchantKyb {
  return {
    merchantId,
    kybStatus: 'unverified',
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
    documents: [],
  };
}
