/**
 * Frontend RUM (Real User Monitoring) entry point.
 *
 * Initializes once per browser session. Respects the application's privacy
 * settings and consent state (if any). Uses deterministic client-side
 * sampling. Collection is lightweight and resilient — failures never break
 * the application.
 *
 * Usage (initialize once in a top-level provider):
 *
 *   import { initRum } from '@/lib/rum';
 *   // In a useEffect or module-level init:
 *   const cleanup = initRum();
 *   // On unmount:
 *   return cleanup;
 */

import { getClientId, shouldSample } from './client';
import { startCollectors } from './collect';
import { enqueue, initSender, destroySender } from './send';
import { normalizeRoute } from './normalize';
import type { RumEvent, RumMetricName, NavigationType } from './types';
import { BUILD_ID } from '@/lib/config';

/** Default sample rate: 10% of sessions. */
const DEFAULT_SAMPLE_RATE = 0.1;

/** Check if telemetry should be active based on privacy settings. */
function isTelemetryEnabled(): boolean {
  // If a consent flag exists in localStorage, respect it.
  if (typeof window !== 'undefined') {
    try {
      const consent = localStorage.getItem('bp_telemetry_consent');
      if (consent === 'false') return false;
    } catch {
      // localStorage may be unavailable
    }
  }

  // Check for global opt-out flag
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__RUM_DISABLED__) {
    return false;
  }

  return true;
}

let isInitialized = false;
let cleanupFn: (() => void) | null = null;

/**
 * Initialize RUM collection.
 *
 * Safe to call multiple times — only the first call takes effect.
 *
 * @param options.sampleRate - Fraction of sessions to sample (0-1). Default 0.1.
 * @param options.route - Current route path.
 * @returns Cleanup function that disconnects all observers and flushes events.
 */
export function initRum(options?: {
  sampleRate?: number;
  route?: string;
}): () => void {
  if (isInitialized) return () => {};

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (!isTelemetryEnabled()) {
    return () => {};
  }

  const sampleRate = options?.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const clientId = getClientId();

  if (!clientId) return () => {};

  if (!shouldSample(clientId, sampleRate)) {
    return () => {};
  }

  isInitialized = true;

  initSender();

  const currentRoute = options?.route
    ? normalizeRoute(options.route)
    : normalizeRoute(window.location.pathname);

  cleanupFn = startCollectors({
    clientId,
    route: currentRoute,
    onEvent: enqueue,
  });

  return () => {
    if (cleanupFn) {
      cleanupFn();
      cleanupFn = null;
    }
    destroySender();
    isInitialized = false;
  };
}

/**
 * Manually record a RUM event (useful for route changes and hydration errors).
 */
export function recordRumEvent(
  name: RumMetricName,
  value: number,
  route: string,
  extra?: { navigationType?: NavigationType }
): void {
  const event: RumEvent = {
    clientId: getClientId(),
    route: normalizeRoute(route),
    name,
    value,
    navigationType: extra?.navigationType,
    timestamp: typeof performance !== 'undefined' && performance.timeOrigin
      ? performance.timeOrigin + performance.now()
      : Date.now(),
    appVersion: BUILD_ID,
  };
  enqueue(event);
}

// Re-export types and utilities for consumers
export type { RumEvent, RumBatchPayload, RumMetricName, NavigationType } from './types';
export { normalizeRoute } from './normalize';
export { getClientId, shouldSample, djb2Hash } from './client';
export { VALID_METRIC_NAMES } from './types';
