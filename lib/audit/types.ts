/**
 * Platform audit trail, shaped like the backend `AuditLog` model
 * (action, entityType, entityId, actorId, changes, ipAddress).
 */
export interface AuditChanges {
  before: unknown;
  after: unknown;
}

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorType: string | null;
  changes: AuditChanges | null;
  ipAddress: string | null;
  /** ISO timestamp. */
  createdAt: string;
}

export interface AuditFilters {
  entityType?: string;
  /** Exact action, or a `PREFIX_*` wildcard. */
  action?: string;
  actor?: string;
  ip?: string;
  /** Inclusive ISO bounds. */
  from?: string;
  to?: string;
  /** Free text over action, entity, actor, ip and the changes JSON. */
  q?: string;
}

export interface AuditPage {
  data: AuditEntry[];
  /** Number of rows matching the filters across all pages. */
  total: number;
  /** Opaque cursor for the next page, or null at the end. */
  nextCursor: string | null;
}

export type NewAuditEntry = Omit<AuditEntry, "id" | "createdAt"> &
  Partial<Pick<AuditEntry, "id" | "createdAt">>;
