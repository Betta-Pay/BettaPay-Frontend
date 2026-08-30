/**
 * Maps the KYB vocabulary onto the shared, contrast-audited status palette
 * (`lib/status/palette`) and defines the settlement-config gate.
 *
 * Keeping this out of `./types` means the data model has no UI dependency and
 * every KYB badge draws from the same `--status-*` variables as payment and
 * system-health badges.
 */

import type { StatusTone } from '@/lib/status/palette';
import type { KybDocStatus, KybStatus } from './types';

/** The value the auth user object may carry for `kybStatus`. */
export type AuthUserKybStatus = 'pending' | 'approved' | 'rejected' | 'none';

/** Fold the auth user's value (or anything unknown) into our `KybStatus`. */
export function normalizeKybStatus(
  value: KybStatus | AuthUserKybStatus | null | undefined,
): KybStatus {
  switch (value) {
    case 'pending':
    case 'approved':
    case 'rejected':
    case 'unverified':
      return value;
    default:
      // 'none', undefined, null, or any unexpected string.
      return 'unverified';
  }
}

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** One line the merchant reads under the badge. */
  description: string;
}

export const KYB_STATUS_META: Record<KybStatus, StatusMeta> = {
  unverified: {
    label: 'Not started',
    tone: 'neutral',
    description: 'Upload your business documents to start verification.',
  },
  pending: {
    label: 'Under review',
    tone: 'warn',
    description: 'We are reviewing your documents. This usually takes 1–2 business days.',
  },
  approved: {
    label: 'Verified',
    tone: 'ok',
    description: 'Your business is verified. All features are unlocked.',
  },
  rejected: {
    label: 'Action required',
    tone: 'down',
    description: 'One or more documents need to be re-uploaded. See the reason below.',
  },
};

export const KYB_DOC_STATUS_META: Record<KybDocStatus, StatusMeta> = {
  uploaded: {
    label: 'Uploaded',
    tone: 'info',
    description: 'Received. It will be queued for review shortly.',
  },
  under_review: {
    label: 'Under review',
    tone: 'warn',
    description: 'A reviewer is checking this document.',
  },
  verified: {
    label: 'Verified',
    tone: 'ok',
    description: 'This document has been accepted.',
  },
  rejected: {
    label: 'Rejected',
    tone: 'down',
    description: 'This document was not accepted. Upload a replacement.',
  },
};

/**
 * Settlement rule configuration (the fee-rules editor) is gated until identity
 * verification has at least been submitted — `kybStatus` is at least "pending".
 * `rejected` still counts: the merchant has engaged and can keep configuring
 * while they fix documents. Only "not started" is locked.
 */
export function isSettlementConfigUnlocked(
  status: KybStatus | AuthUserKybStatus | null | undefined,
): boolean {
  const normalized = normalizeKybStatus(status);
  return normalized === 'pending' || normalized === 'approved' || normalized === 'rejected';
}
