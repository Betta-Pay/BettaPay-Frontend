export interface CursorPage<T> { data: T[]; nextCursor: string | null }
export interface AdminAuditEntry {
  id: string; action: string; entityId: string; createdAt: string;
  reviewerEmail?: string; actorId?: string; note?: string | null;
}
export interface AdminMerchant {
  id: string; businessName: string; contactEmail: string; country: string;
  status: string; kycStatus: string; reviewerId: string | null;
  paymentCount: number; settlementCount: number; lastActivity: string | null;
  auditLog?: AdminAuditEntry[];
}
