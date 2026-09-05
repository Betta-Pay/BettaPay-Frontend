/**
 * Per-domain query defaults so FX rates, history, payments, and settlements
 * each get the freshness policy that matches their usage pattern.
 */

/** FX rates — freshness-critical, refetch on window focus. */
export const fxRateQueryOptions = {

  staleTime: 10_000,
  gcTime: 30_000,
  refetchOnWindowFocus: true,
  retry: 1,
};

/** Settlement / payment history — tolerant of staleness, no focus refetch. */
export const historyQueryOptions = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
};

/** Payments list — moderate freshness. */
export const paymentsQueryOptions = {
  staleTime: 30_000,
  gcTime: 2 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
};

/** Dashboard / summary — refetch on focus for digest pages. */
export const dashboardQueryOptions = {
  staleTime: 20_000,
  gcTime: 2 * 60_000,
  refetchOnWindowFocus: true,
  retry: 1,
};
