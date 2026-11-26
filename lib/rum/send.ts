/**
 * Batched RUM event sender.
 *
 * Accumulates events in memory and flushes them periodically or when the
 * page visibility changes / unloads. Uses navigator.sendBeacon when available
 * (most reliable during page unload), with fetch fallback.
 *
 * Failures are silently contained — telemetry never surfaces errors to the
 * application.
 */

import type { RumEvent, RumBatchPayload } from './types';

const FLUSH_INTERVAL_MS = 30_000;
const MAX_BATCH_SIZE = 50;
/** Hard ceiling on queued events so an offline burst cannot grow memory without bound. */
export const MAX_QUEUE_SIZE = 500;
const ENDPOINT = '/api/rum';

let queue: RumEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let isDestroyed = false;

function getEndpoint(): string {
  return ENDPOINT;
}

async function sendBatch(events: RumEvent[]): Promise<void> {
  if (events.length === 0) return;

  const payload: RumBatchPayload = { events };
  const body = JSON.stringify(payload);

  try {
    // A refused or throwing sendBeacon falls through to a keepalive fetch.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(getEndpoint(), blob)) return;
      } catch {
        // Fall through to fetch.
      }
    }

    // Fallback: fire-and-forget fetch (best-effort)
    if (typeof fetch !== 'undefined') {
      await fetch(getEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // Silently ignore — telemetry must never break the application
  }
}

function flush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) return;

  // Take all queued events
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
 * Enqueue a RUM event for batched delivery.
 */
export function enqueue(event: RumEvent): void {
  if (isDestroyed) return;

  if (queue.length >= MAX_QUEUE_SIZE) {
    // Drop the oldest event rather than growing without bound.
    queue.shift();
  }
  queue.push(event);

  if (queue.length >= MAX_BATCH_SIZE) {
    flush();
  } else {
    scheduleFlush();
  }
}

let listenersAttached = false;

const handleVisibilityChange = (): void => {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    flush();
  }
};

const handleUnload = (): void => {
  flush();
};

/**
 * Set up automatic flushing on page visibility change and unload. Idempotent.
 */
export function initSender(): void {
  if (typeof document === 'undefined' || listenersAttached) return;

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload);
  listenersAttached = true;
}

/**
 * Tear down the sender: flush what is queued and remove exactly the listeners
 * that initSender added.
 */
export function destroySender(): void {
  isDestroyed = true;
  flush();

  if (typeof document !== 'undefined' && listenersAttached) {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleUnload);
    window.removeEventListener('pagehide', handleUnload);
    listenersAttached = false;
  }
}

/**
 * Reset the sender state (for testing).
 */
export function resetSender(): void {
  queue = [];
  isDestroyed = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/**
 * Expose queue size for testing.
 */
export function getQueueSize(): number {
  return queue.length;
}
