/**
 * In-memory RUM event store.
 *
 * Stores validated RUM events for aggregation. Uses a ring buffer to bound
 * memory usage. This is a server-side only module — never imported by
 * client code.
 *
 * For production use at scale, events would be flushed to a database.
 * This in-memory approach is sufficient for moderate traffic and keeps
 * the implementation self-contained.
 */

import type { RumEvent, RumMetricName } from './types';

export const MAX_EVENTS = 50;
export const MAX_ERROR_BUFFER_SIZE = MAX_EVENTS;

// Use a global to survive hot-reload in development
const globalForRumStore = global as unknown as {
  __rumEvents?: RumEvent[];
};

const events: RumEvent[] = globalForRumStore.__rumEvents || [];

if (process.env.NODE_ENV !== 'production') {
  globalForRumStore.__rumEvents = events;
}

/**
 * Store a validated RUM event. Drops the oldest events (FIFO) if at capacity.
 */
export function storeEvent(event: RumEvent): void {
  while (events.length >= MAX_EVENTS) {
    events.shift();
  }
  events.push(event);
}

/**
 * Store multiple validated RUM events.
 */
export function storeEvents(batch: RumEvent[]): void {
  for (const event of batch) {
    storeEvent(event);
  }
}

/**
 * Query events for aggregation. Returns events matching the filter criteria.
 * Results are limited to prevent expensive unbounded queries.
 */
export function queryEvents(options: {
  route?: string;
  metricName?: RumMetricName;
  since?: number; // timestamp ms
  until?: number; // timestamp ms
  limit?: number;
}): RumEvent[] {
  const { route, metricName, since, until, limit = 1000 } = options;

  let results = events;

  if (route) {
    results = results.filter((e) => e.route === route);
  }

  if (metricName) {
    results = results.filter((e) => e.name === metricName);
  }

  if (since !== undefined) {
    results = results.filter((e) => e.timestamp >= since);
  }

  if (until !== undefined) {
    results = results.filter((e) => e.timestamp <= until);
  }

  // Return most recent events first, limited
  return results.slice(-limit).reverse();
}

/**
 * Get all distinct routes in the store.
 */
export function getRoutes(): string[] {
  const routes = new Set<string>();
  for (const event of events) {
    routes.add(event.route);
  }
  return Array.from(routes).sort();
}

/**
 * Get total event count.
 */
export function getEventCount(): number {
  return events.length;
}

/**
 * Clear all events (for testing).
 */
export function clearEvents(): void {
  events.length = 0;
}
