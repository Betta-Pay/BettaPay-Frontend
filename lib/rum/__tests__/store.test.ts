import {
  storeEvent,
  storeEvents,
  queryEvents,
  getRoutes,
  getEventCount,
  clearEvents,
  MAX_EVENTS,
  MAX_ERROR_BUFFER_SIZE,
} from '../store';
import type { RumEvent } from '../types';

function makeEvent(overrides?: Partial<RumEvent>): RumEvent {
  return {
    clientId: 'test-client-123',
    route: '/dashboard',
    name: 'fcp',
    value: 150,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('RUM event store', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('stores a single event', () => {
    storeEvent(makeEvent());
    expect(getEventCount()).toBe(1);
  });

  it('stores multiple events', () => {
    storeEvents([makeEvent(), makeEvent({ route: '/overview' })]);
    expect(getEventCount()).toBe(2);
  });

  it('returns distinct routes', () => {
    storeEvent(makeEvent({ route: '/dashboard' }));
    storeEvent(makeEvent({ route: '/overview' }));
    storeEvent(makeEvent({ route: '/dashboard' })); // duplicate
    const routes = getRoutes();
    expect(routes).toEqual(['/dashboard', '/overview']);
  });

  it('queries events by route', () => {
    storeEvent(makeEvent({ route: '/dashboard' }));
    storeEvent(makeEvent({ route: '/overview' }));
    const results = queryEvents({ route: '/dashboard' });
    expect(results).toHaveLength(1);
    expect(results[0].route).toBe('/dashboard');
  });

  it('queries events by metric name', () => {
    storeEvent(makeEvent({ name: 'fcp' }));
    storeEvent(makeEvent({ name: 'lcp' }));
    const results = queryEvents({ metricName: 'lcp' });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('lcp');
  });

  it('queries events by time range', () => {
    const now = Date.now();
    storeEvent(makeEvent({ timestamp: now - 10000 }));
    storeEvent(makeEvent({ timestamp: now }));
    storeEvent(makeEvent({ timestamp: now + 10000 }));

    const results = queryEvents({ since: now - 5000, until: now + 5000 });
    expect(results).toHaveLength(1);
  });

  it('limits results', () => {
    for (let i = 0; i < 100; i++) {
      storeEvent(makeEvent({ value: i }));
    }
    const results = queryEvents({ limit: 10 });
    expect(results).toHaveLength(10);
  });

  it('drops oldest events when at capacity', () => {
    expect(MAX_EVENTS).toBe(50);
    expect(MAX_ERROR_BUFFER_SIZE).toBe(50);

    for (let i = 0; i < 100; i++) {
      storeEvent(makeEvent({ value: i }));
    }

    expect(getEventCount()).toBe(50);

    const results = queryEvents({ limit: 100 });
    expect(results).toHaveLength(50);
    // queryEvents returns most recent first
    expect(results[0].value).toBe(99);
    expect(results[results.length - 1].value).toBe(50);
  });

  it('clears all events', () => {
    storeEvent(makeEvent());
    storeEvent(makeEvent());
    clearEvents();
    expect(getEventCount()).toBe(0);
  });
});
