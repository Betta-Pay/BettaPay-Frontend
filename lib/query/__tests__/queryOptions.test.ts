/**
 * lib/query/__tests__/queryOptions.test.ts
 *
 * Validates the per-domain query option exports from queryOptions.ts.
 * Each option set must define explicit staleTime, gcTime, refetchOnWindowFocus,
 * and retry values so React Query never falls back to unpredictable defaults.
 */

import {
  fxRateQueryOptions,
  historyQueryOptions,
  paymentsQueryOptions,
  dashboardQueryOptions,
} from '../queryOptions';

const allOptions = [
  { name: 'fxRateQueryOptions', options: fxRateQueryOptions },
  { name: 'historyQueryOptions', options: historyQueryOptions },
  { name: 'paymentsQueryOptions', options: paymentsQueryOptions },
  { name: 'dashboardQueryOptions', options: dashboardQueryOptions },
];

describe('queryOptions — per-domain defaults', () => {
  it.each(allOptions)(
    '$name defines explicit staleTime, gcTime, refetchOnWindowFocus, and retry',
    ({ options }) => {
      expect(options).toHaveProperty('staleTime');
      expect(options).toHaveProperty('gcTime');
      expect(options).toHaveProperty('refetchOnWindowFocus');
      expect(options).toHaveProperty('retry');

      expect(typeof options.staleTime).toBe('number');
      expect(typeof options.gcTime).toBe('number');
      expect(typeof options.refetchOnWindowFocus).toBe('boolean');
      expect(typeof options.retry).toBe('number');
    },
  );

  it.each(allOptions)(
    '$name staleTime is positive (never zero)',
    ({ options }) => {
      expect(options.staleTime).toBeGreaterThan(0);
    },
  );

  it.each(allOptions)(
    '$name gcTime is greater than or equal to staleTime',
    ({ options }) => {
      expect(options.gcTime).toBeGreaterThanOrEqual(options.staleTime);
    },
  );

  describe('FX rates — high-volatility data', () => {
    it('uses a short staleTime for freshness', () => {
      expect(fxRateQueryOptions.staleTime).toBeLessThanOrEqual(30_000);
    });

    it('refetches on window focus', () => {
      expect(fxRateQueryOptions.refetchOnWindowFocus).toBe(true);
    });
  });

  describe('history — low-volatility data', () => {
    it('uses a longer staleTime than FX rates', () => {
      expect(historyQueryOptions.staleTime).toBeGreaterThan(
        fxRateQueryOptions.staleTime,
      );
    });

    it('does not refetch on window focus', () => {
      expect(historyQueryOptions.refetchOnWindowFocus).toBe(false);
    });
  });

  describe('payments — moderate-volatility data', () => {
    it('staleTime is between FX rates and history', () => {
      expect(paymentsQueryOptions.staleTime).toBeGreaterThan(
        fxRateQueryOptions.staleTime,
      );
      expect(paymentsQueryOptions.staleTime).toBeLessThanOrEqual(
        historyQueryOptions.staleTime,
      );
    });
  });

  describe('dashboard — digest pages', () => {
    it('refetches on window focus for live digest views', () => {
      expect(dashboardQueryOptions.refetchOnWindowFocus).toBe(true);
    });
  });
});
