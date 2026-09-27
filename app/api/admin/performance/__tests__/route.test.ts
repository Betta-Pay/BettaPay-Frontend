import { clearEvents, storeEvents } from '@/lib/rum/store';
import type { RumEvent } from '@/lib/rum/types';

jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        headers: new Map(Object.entries({ 'content-type': 'application/json', ...((init?.headers as Record<string, string>) || {}) })),
        body: JSON.stringify(data),
      };
    },
  },
}));

const mockGuardAdminApi = jest.fn();
jest.mock('@/lib/auth/adminApiGuard', () => ({
  guardAdminApi: () => mockGuardAdminApi(),
}));

import { GET } from '../route';

function makeAdminRequest(path = '/api/admin/performance') {
  return {
    url: `http://localhost${path}`,
    headers: {
      get() { return null; },
    },
  } as unknown as Request;
}

function seedTestData() {
  const now = Date.now();
  const events: RumEvent[] = [];
  const routes = ['/dashboard', '/overview', '/payments'];

  for (const route of routes) {
    for (let i = 0; i < 10; i++) {
      events.push({
        clientId: `client${i}`,
        route,
        name: 'lcp',
        value: 100 + Math.random() * 900,
        timestamp: now - Math.random() * 86400000 * 7,
      });
    }
  }

  // Add some FCP events
  for (let i = 0; i < 5; i++) {
    events.push({
      clientId: `client${i}`,
      route: '/dashboard',
      name: 'fcp',
      value: 50 + Math.random() * 300,
      timestamp: now - Math.random() * 86400000 * 7,
    });
  }

  storeEvents(events);
}

describe('GET /api/admin/performance', () => {
  beforeEach(() => {
    clearEvents();
    mockGuardAdminApi.mockResolvedValue(null);
  });

  it('returns the guard response and no data for non-admin callers', async () => {
    seedTestData();
    const forbidden = { status: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    mockGuardAdminApi.mockResolvedValue(forbidden);
    const res = await GET(makeAdminRequest());
    expect(res).toBe(forbidden);
  });

  it('returns empty data when no events exist', async () => {
    const req = makeAdminRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.totalEvents).toBe(0);
    expect(body.routes).toEqual([]);
  });

  it('returns performance data with seeded events', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.totalEvents).toBe(35);
    expect(body.routes.length).toBe(3);
    expect(body.data).not.toBeNull();
    expect(body.data.percentiles).toBeDefined();
    expect(body.data.trend).toBeDefined();
    expect(body.data.distribution).toBeDefined();
  });

  it('filters by route', async () => {
    seedTestData();
    const req = makeAdminRequest('/api/admin/performance?route=/dashboard');
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.data.route).toBe('/dashboard');
  });

  it('filters by metric', async () => {
    seedTestData();
    const req = makeAdminRequest('/api/admin/performance?metric=fcp');
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.data.metric).toBe('fcp');
    expect(body.data.sampleCount).toBe(5);
  });

  it('filters by time range', async () => {
    seedTestData();
    const req = makeAdminRequest('/api/admin/performance?days=1');
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.data).not.toBeNull();
  });

  it('returns percentile data', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.data.percentiles.p50).toBeGreaterThanOrEqual(0);
    expect(body.data.percentiles.p90).toBeGreaterThanOrEqual(body.data.percentiles.p50);
  });

  it('returns route summaries sorted by count', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    const summaries = body.data.routeSummaries;
    expect(summaries.length).toBeGreaterThan(0);
    for (let i = 1; i < summaries.length; i++) {
      expect(summaries[i].count).toBeLessThanOrEqual(summaries[i - 1].count);
    }
  });

  it('returns distribution data', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.data.distribution.length).toBeGreaterThan(0);
    const totalInBuckets = body.data.distribution.reduce(
      (sum: number, b: { count: number }) => sum + b.count,
      0
    );
    expect(totalInBuckets).toBe(body.data.sampleCount);
  });

  it('includes available metrics list', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.metrics).toContain('lcp');
    expect(body.metrics).toContain('fcp');
  });

  it('rejects invalid query parameters', async () => {
    const req = makeAdminRequest('/api/admin/performance?days=999');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns time range', async () => {
    seedTestData();
    const req = makeAdminRequest();
    const res = await GET(req);
    const body = JSON.parse((res as { body: string }).body);
    expect(body.timeRange.from).toBeDefined();
    expect(body.timeRange.to).toBeDefined();
  });
});
