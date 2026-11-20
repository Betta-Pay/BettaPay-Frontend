/**
 * Resolve an audit entity to the admin page that shows it, or null when no
 * page exists for that kind of entity. Only existing routes are linked, so a
 * link never leads to a 404.
 */
export function entityHref(entityType: string, entityId: string): string | null {
  const id = encodeURIComponent(entityId);
  switch (entityType) {
    case "MERCHANT":
      return `/merchants/kyb?merchant=${id}`;
    case "ANCHOR":
    case "Anchor":
      return `/anchors?anchor=${id}`;
    case "SETTLEMENT_BATCH":
    case "SettlementBatch":
      return `/batches?batch=${id}`;
    case "IP":
      return `/security/ip-scores?ip=${id}`;
    case "PLATFORM_SETTINGS":
      return `/admin/settings`;
    default:
      return null;
  }
}
