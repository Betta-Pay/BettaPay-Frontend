import type { ServiceHealth } from '@/lib/types/health';

jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        ok: (init?.status ?? 200) < 400,
        headers: new Map(
          Object.entries((init?.headers as Record<string, string>) ?? {}),
        ),
        json: async () => data,
      };
    },
  },
}));

jest.mock('@/lib/health/checkers', () => ({
  checkHorizon: jest.fn(),
  checkSoroban: jest.fn(),
  checkSep24: jest.fn(),
  checkPostgres: jest.fn(),
}));

import * as checkers from '@/lib/health/checkers';
import { GET } from '../route';

const mocked = checkers as jest.Mocked<typeof checkers>;

const service = (over: Partial<ServiceHealth> & Pick<ServiceHealth, 'service'>): ServiceHealth => ({
  label: over.service,
  status: 'healthy',
  checkedAt: '2026-08-28T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  mocked.checkHorizon.mockResolvedValue(
    service({ service: 'horizon', status: 'healthy', latencyMs: 90, meta: { endpoint: 'https://horizon.example' } }),
  );
  mocked.checkSoroban.mockResolvedValue(service({ service: 'soroban', status: 'healthy' }));
  mocked.checkSep24.mockResolvedValue(
    service({ service: 'sep24', status: 'unhealthy', errorMessage: 'unreachable' }),
  );
  mocked.checkPostgres.mockResolvedValue(service({ service: 'postgres', status: 'degraded' }));
});

afterEach(() => jest.clearAllMocks());

describe('GET /api/status/health', () => {
  it('is publicly reachable (no admin cookie) and returns every probe', async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.services.map((s: ServiceHealth) => s.service).sort()).toEqual([
      'horizon',
      'postgres',
      'sep24',
      'soroban',
    ]);
    expect(typeof body.aggregatedAt).toBe('string');
  });

  it('forwards live per-service status through to the client', async () => {
    const body = await (await GET()).json();
    const sep24 = body.services.find((s: ServiceHealth) => s.service === 'sep24');
    expect(sep24.status).toBe('unhealthy');
    expect(sep24.errorMessage).toBe('unreachable');
  });

  it('strips the internal `meta` bag so endpoint hostnames do not leak', async () => {
    const body = await (await GET()).json();
    for (const svc of body.services as ServiceHealth[]) {
      expect(svc.meta).toBeUndefined();
    }
  });

  it('sets a no-store cache header', async () => {
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toMatch(/no-store/);
  });
});
