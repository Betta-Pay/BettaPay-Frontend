/**
 * In-memory KYB store for the merchant-facing API routes.
 *
 * This mirrors the admin-side `merchantKybStore` and exists so the frontend
 * flow works end to end without a running backend. A real deployment replaces
 * these functions with calls to the KYB service. State lives for the lifetime
 * of the server process only.
 */

import type {
  KybDocStatus,
  KybDocType,
  KybDocument,
  KybStatus,
  MerchantKyb,
} from './types';
import { emptyMerchantKyb } from './types';

const store = new Map<string, MerchantKyb>();

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** A merchant's KYB profile, created empty on first read. */
export function getMerchantKyb(merchantId: string): MerchantKyb {
  const existing = store.get(merchantId);
  if (existing) return existing;
  const fresh = emptyMerchantKyb(merchantId);
  store.set(merchantId, fresh);
  return fresh;
}

function rollUpStatus(documents: KybDocument[]): KybStatus {
  if (documents.length === 0) return 'unverified';
  if (documents.some((d) => d.status === 'rejected')) return 'rejected';
  if (documents.every((d) => d.status === 'verified')) return 'approved';
  return 'pending';
}

export interface UploadInput {
  merchantId: string;
  type: KybDocType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Dev affordance: force the uploaded document into a rejected state. */
  simulateReject?: boolean;
}

export function upsertDocument(input: UploadInput): MerchantKyb {
  const profile = getMerchantKyb(input.merchantId);
  const now = new Date().toISOString();

  const rejected = Boolean(input.simulateReject);
  const status: KybDocStatus = rejected ? 'rejected' : 'uploaded';
  const rejectionReason = rejected
    ? 'The document was unreadable. Please upload a clear, full-page scan or photo.'
    : null;

  const doc: KybDocument = {
    id: randomId('kybdoc'),
    type: input.type,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    status,
    rejectionReason,
    uploadedAt: now,
    reviewedAt: rejected ? now : null,
  };

  // A re-upload replaces the previous document for that slot.
  const documents = profile.documents.filter((d) => d.type !== input.type);
  documents.push(doc);
  documents.sort((a, b) => a.type.localeCompare(b.type));

  const next: MerchantKyb = {
    ...profile,
    documents,
    kybStatus: rollUpStatus(documents),
    rejectionReason: documents.some((d) => d.status === 'rejected')
      ? doc.rejectionReason ?? profile.rejectionReason
      : null,
    submittedAt: profile.submittedAt ?? now,
    reviewedAt: rejected ? now : profile.reviewedAt,
  };
  store.set(input.merchantId, next);
  return next;
}

/** Test-only: wipe a merchant's KYB state. */
export function _resetMerchantKyb(merchantId: string): void {
  store.delete(merchantId);
}
