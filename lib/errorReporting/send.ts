/**
 * Batched error-report transport.
 *
 * Mirrors the RUM sender: accumulate reports in memory, flush on a timer, on
 * a full batch, and when the page is hidden or unloaded. Identical errors
 * inside the same window collapse into one report with a bumped `count`, so a
 * render loop cannot flood the backend.
 *
 * Delivery failures are swallowed — reporting must never surface an error of
 * its own to the application.
 */

import type { ErrorReport, ErrorBatchPayload } from './types';

const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 20;
/** Hard ceiling on the queue so a runaway loop cannot exhaust memory. */
const MAX_QUEUE_SIZE = 100;
const ENDPOINT = '/api/errors';

let queue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isDestroyed = false;
let listenersAttached = false;

async function sendBatch(errors: ErrorReport[]): Promise<void> {
  if (errors.length === 0) return;

  const payload: ErrorBatchPayload = { errors };
  const body = JSON.stringify(payload);

  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([body], { type: 'application/json' });
      const accepted = navigator.sendBeacon(ENDPOINT, blob);
      if (accepted) return;
    }

    if (typeof fetch !== 'undefined') {
      await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Silently ignore — telemetry must never break the application.
  }
}

/** Flush the queue immediately. */
export function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) return;

  // Send in chunks no larger than MAX_BATCH_SIZE; the server rejects bigger batches.
  while (queue.length > 0) {
    void sendBatch(queue.splice(0, MAX_BATCH_SIZE));
  }
}

function scheduleFlush(): void {
  if (flushTimer || isDestroyed) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Enqueue a report for batched delivery, collapsing repeats by fingerprint.
 */
/**
 * Reports about `/api/errors` itself. A failed error POST is reported as an
 * `api` error whose message names the endpoint, so letting it through would
 * queue another POST to the same endpoint, and so on.
 */
const ERRORS_ENDPOINT_PATTERN = /\/api\/errors(?:[/?#\s]|$)/;

export function isErrorsEndpointFailure(report: ErrorReport): boolean {
  return report.source === 'api' && ERRORS_ENDPOINT_PATTERN.test(report.message);
}

export function enqueue(report: ErrorReport): void {
  if (isDestroyed) return;
  if (isErrorsEndpointFailure(report)) return;

  const existing = queue.find((r) => r.fingerprint === report.fingerprint);
  if (existing) {
    existing.count += report.count;
    return;
  }

  if (queue.length >= MAX_QUEUE_SIZE) {
    flush();
  }

  queue.push(report);

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

const handleVisibilityChange = (): void => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    flush();
  }
};

const handleUnload = (): void => {
  flush();
};

/** Attach the flush-on-hide / flush-on-unload listeners. Idempotent. */
export function initSender(): void {
  if (typeof document === 'undefined' || listenersAttached) return;

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handleUnload);
  listenersAttached = true;
}

/** Tear the sender down, flushing anything still queued. */
export function destroySender(): void {
  isDestroyed = true;
  flush();

  if (typeof document !== 'undefined' && listenersAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handleUnload);
    listenersAttached = false;
  }
}

/** Reset transport state (tests only). */
export function resetSender(): void {
  queue = [];
  isDestroyed = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Current queue depth (tests only). */
export function getQueueSize(): number {
  return queue.length;
}
