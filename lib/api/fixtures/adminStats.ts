import type { AdminStats } from '../hooks';

/**
 * Illustrative admin analytics used ONLY for local development when the
 * `/api/admin/stats` endpoint is not deployed.
 *
 * `useAdminStats` references this module exclusively inside a
 * `process.env.NODE_ENV !== 'production'` guard, so bundlers dead-code
 * eliminate that branch and tree-shake this file out of production builds.
 * It must never be rendered without a visible "sample data" indicator.
 */
export const MOCK_ADMIN_STATS: AdminStats = {
  totalProcessed: 1452310.89,
  totalProcessedChangePct: 12.5,
  platformFees: 14523.1,
  feeRatePct: 1.0,
  activeMerchants: 142,
  newMerchantsThisWeek: 12,
  pendingKyb: 8,
};
