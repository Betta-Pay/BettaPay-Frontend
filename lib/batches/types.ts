/**
 * Shapes mirror the backend Prisma models `SettlementBatch` and `Settlement`
 * (BettaPay-Backend prisma/schema.prisma). Money fields are decimal strings,
 * exactly as the backend stores them.
 */
export type SettlementStatus = "pending" | "processing" | "completed" | "failed";

export interface SettlementBatch {
  id: string;
  asset: string;
  totalCount: number;
  totalGross: string;
  totalFees: string;
  totalNet: string;
  createdAt: string;
  processedAt: string | null;
}

export interface BatchSettlement {
  id: string;
  merchantId: string;
  totalAmount: string;
  grossAmount: string;
  feeAmount: string;
  netAmount: string;
  feeBps: number;
  asset: string;
  status: SettlementStatus;
  batchId: string | null;
  initiatedAt: string;
  completedAt: string | null;
  /** The NEWER settlement that supersedes this one (retry chain link). */
  supersededById: string | null;
}

/** Derived from real member data only; see `derive.ts`. */
export type BatchStatus =
  | "created"
  | "processing"
  | "completed"
  | "completed_with_failures"
  | "failed";

export interface TimelineEvent {
  key: string;
  label: string;
  at: string;
}

export interface BatchSummary extends SettlementBatch {
  status: BatchStatus;
  /** Counts of chain heads (latest attempt of each settlement) by status. */
  counts: Record<SettlementStatus, number>;
  memberCount: number;
}

export interface MemberDetail extends BatchSettlement {
  /** True when a newer retry replaced this settlement. */
  superseded: boolean;
  /** Ordered ids from the original attempt to the latest one. */
  chain: string[];
}

export interface BatchDetail extends BatchSummary {
  timeline: TimelineEvent[];
  members: MemberDetail[];
  /** One entry per chain, original first, latest last. */
  chains: BatchSettlement[][];
}

export interface BatchPage {
  data: BatchSummary[];
  total: number;
  nextCursor: string | null;
  pageInfo: { limit: number; total: number; hasNextPage: boolean };
}
