/**
 * Browser metric collectors using PerformanceObserver and Performance API.
 *
 * Each collector:
 *  - Checks for API availability before setting up observers
 *  - Silently no-ops in unsupported browsers
 *  - Never blocks rendering or navigation
 *  - Collects only non-PII technical performance data
 *
 * Returns a cleanup function to disconnect observers and prevent memory leaks.
 */

import type { RumEvent, NavigationType } from './types';
import { normalizeRoute } from './normalize';
import { BUILD_ID } from '@/lib/config';

interface CollectorOptions {
  clientId: string;
  route: string;
  onEvent: (event: RumEvent) => void;
}

function navigationType(): NavigationType {
  if (typeof performance === 'undefined') return 'navigate';
  const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (entries.length === 0) return 'navigate';
  return (entries[0] as unknown as { type: string }).type as NavigationType || 'navigate';
}

function now(): number {
  return typeof performance !== 'undefined' && performance.timeOrigin
    ? performance.timeOrigin + performance.now()
    : Date.now();
}

function appVersion(): string | undefined {
  return BUILD_ID;
}

/**
 * Collect First Contentful Paint (FCP).
 */
export function collectFCP(opts: CollectorOptions): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          opts.onEvent({
            clientId: opts.clientId,
            route: normalizeRoute(opts.route),
            name: 'fcp',
            value: entry.startTime,
            navigationType: navigationType(),
            timestamp: now(),
            appVersion: appVersion(),
          });
        }
      }
    });

    observer.observe({ type: 'paint', buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/**
 * Collect Largest Contentful Paint (LCP).
 */
export function collectLCP(opts: CollectorOptions): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      // LCP is the last entry in the list
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        opts.onEvent({
          clientId: opts.clientId,
          route: normalizeRoute(opts.route),
          name: 'lcp',
          value: lastEntry.startTime,
          navigationType: navigationType(),
          timestamp: now(),
          appVersion: appVersion(),
        });
      }
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/**
 * Collect Cumulative Layout Shift (CLS).
 */
export function collectCLS(opts: CollectorOptions): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  let clsValue = 0;
  let reportScheduled = false;

  function report() {
    reportScheduled = false;
    opts.onEvent({
      clientId: opts.clientId,
      route: normalizeRoute(opts.route),
      name: 'cls',
      value: clsValue,
      navigationType: navigationType(),
      timestamp: now(),
      appVersion: appVersion(),
    });
  }

  interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as LayoutShiftEntry;
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value;
        }
      }

      if (!reportScheduled) {
        reportScheduled = true;
        // Debounce: report after 1 second of no new shifts
        setTimeout(report, 1000);
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
    return () => {
      observer.disconnect();
      if (reportScheduled) {
        report();
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * Collect Long Tasks (> 50ms).
 */
export function collectLongTasks(opts: CollectorOptions): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        opts.onEvent({
          clientId: opts.clientId,
          route: normalizeRoute(opts.route),
          name: 'long_task',
          value: entry.duration,
          navigationType: navigationType(),
          timestamp: now(),
          appVersion: appVersion(),
        });
      }
    });

    observer.observe({ type: 'longtask', buffered: false });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/**
 * Collect navigation timing (TTFB, DOMContentLoaded, Load).
 */
export function collectNavigation(opts: CollectorOptions): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  function reportNavigation() {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (entries.length === 0) return;

    const nav = entries[0];
    const base = {
      clientId: opts.clientId,
      route: normalizeRoute(opts.route),
      navigationType: navigationType(),
      timestamp: now(),
      appVersion: appVersion(),
    };

    // TTFB
    if (nav.responseStart > 0) {
      opts.onEvent({ ...base, name: 'ttfb', value: nav.responseStart });
    }

    // DOMContentLoaded
    if (nav.domContentLoadedEventEnd > 0) {
      opts.onEvent({ ...base, name: 'domContentLoaded', value: nav.domContentLoadedEventEnd });
    }

    // Load
    if (nav.loadEventEnd > 0) {
      opts.onEvent({ ...base, name: 'load', value: nav.loadEventEnd });
    }
  }

  // Report immediately if navigation entries are already available
  if (performance.getEntriesByType('navigation').length > 0) {
    reportNavigation();
    return () => {};
  }

  // Otherwise wait for the load event
  if (typeof window !== 'undefined') {
    const handler = () => {
      reportNavigation();
      window.removeEventListener('load', handler);
    };
    window.addEventListener('load', handler);
    return () => window.removeEventListener('load', handler);
  }

  return () => {};
}

/**
 * Start all metric collectors and return a cleanup function.
 */
export function startCollectors(opts: CollectorOptions): () => void {
  const cleanups = [
    collectFCP(opts),
    collectLCP(opts),
    collectCLS(opts),
    collectLongTasks(opts),
    collectNavigation(opts),
  ];

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
