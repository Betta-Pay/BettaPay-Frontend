import {
  mapServicesToComponents,
  deriveIncidents,
  getOverallStatus,
  healthStatusToLevel,
  getComponentName,
} from '@/lib/status/data';
import type { HealthResponse, ServiceHealth } from '@/lib/types/health';

const svc = (over: Partial<ServiceHealth> & Pick<ServiceHealth, 'service'>): ServiceHealth => ({
  label: over.service,
  status: 'healthy',
  checkedAt: '2026-08-25T12:00:00.000Z',
  ...over,
});

const response = (services: ServiceHealth[]): HealthResponse => ({
  aggregatedAt: '2026-08-25T12:00:00.000Z',
  services,
});

describe('healthStatusToLevel', () => {
  it('maps probe vocabulary onto the public status vocabulary', () => {
    expect(healthStatusToLevel('healthy')).toBe('operational');
    expect(healthStatusToLevel('degraded')).toBe('degraded');
    expect(healthStatusToLevel('unhealthy')).toBe('down');
  });
});

describe('mapServicesToComponents', () => {
  it('reports every known service as "unknown" when there is no data', () => {
    const components = mapServicesToComponents(null);
    expect(components).toHaveLength(4);
    expect(components.every((c) => c.status === 'unknown')).toBe(true);
    expect(components.every((c) => c.checkedAt === null)).toBe(true);
  });

  it('carries live status, latency and the real checkedAt through', () => {
    const components = mapServicesToComponents(
      response([
        svc({ service: 'horizon', status: 'healthy', latencyMs: 120 }),
        svc({ service: 'soroban', status: 'unhealthy', errorMessage: 'unreachable' }),
      ]),
    );

    const horizon = components.find((c) => c.id === 'horizon')!;
    expect(horizon.status).toBe('operational');
    expect(horizon.latencyMs).toBe(120);
    expect(horizon.checkedAt).toBe('2026-08-25T12:00:00.000Z');

    const soroban = components.find((c) => c.id === 'soroban')!;
    expect(soroban.status).toBe('down');
    expect(soroban.errorMessage).toBe('unreachable');
  });

  it('backfills known services missing from the payload as "unknown"', () => {
    const components = mapServicesToComponents(
      response([svc({ service: 'horizon', status: 'healthy' })]),
    );
    expect(components).toHaveLength(4);
    expect(components.find((c) => c.id === 'postgres')!.status).toBe('unknown');
  });
});

describe('getOverallStatus', () => {
  const from = (data: HealthResponse | null) =>
    getOverallStatus(mapServicesToComponents(data));

  it('is "unknown" (never a green banner) when data is missing', () => {
    expect(from(null)).toEqual({ level: 'unknown', label: 'Status Unknown' });
  });

  it('is a major outage when any service is down', () => {
    expect(
      from(
        response([
          svc({ service: 'horizon', status: 'healthy' }),
          svc({ service: 'soroban', status: 'unhealthy' }),
          svc({ service: 'sep24', status: 'healthy' }),
          svc({ service: 'postgres', status: 'healthy' }),
        ]),
      ),
    ).toEqual({ level: 'down', label: 'Major Outage' });
  });

  it('is a partial outage when a service is degraded but none are down', () => {
    expect(
      from(
        response([
          svc({ service: 'horizon', status: 'healthy' }),
          svc({ service: 'soroban', status: 'degraded' }),
          svc({ service: 'sep24', status: 'healthy' }),
          svc({ service: 'postgres', status: 'healthy' }),
        ]),
      ).level,
    ).toBe('degraded');
  });

  it('is fully operational only when every service is healthy', () => {
    expect(
      from(
        response([
          svc({ service: 'horizon', status: 'healthy' }),
          svc({ service: 'soroban', status: 'healthy' }),
          svc({ service: 'sep24', status: 'healthy' }),
          svc({ service: 'postgres', status: 'healthy' }),
        ]),
      ),
    ).toEqual({ level: 'operational', label: 'All Systems Operational' });
  });
});

describe('deriveIncidents', () => {
  it('is empty when nothing is degraded or down', () => {
    expect(deriveIncidents(mapServicesToComponents(
      response([svc({ service: 'horizon', status: 'healthy' })]),
    ))).toEqual([]);
  });

  it('creates one incident per unhealthy service, timestamped with the real probe time', () => {
    const components = mapServicesToComponents(
      response([
        svc({
          service: 'sep24',
          status: 'unhealthy',
          checkedAt: '2026-08-25T11:30:00.000Z',
          errorMessage: 'SEP-24 Anchor is unreachable',
        }),
      ]),
    );
    const incidents = deriveIncidents(components);

    expect(incidents).toHaveLength(1);
    expect(incidents[0].affectedComponents).toEqual(['sep24']);
    expect(incidents[0].createdAt).toBe('2026-08-25T11:30:00.000Z');
    expect(incidents[0].updates[0].timestamp).toBe('2026-08-25T11:30:00.000Z');
    expect(incidents[0].updates[0].message).toBe('SEP-24 Anchor is unreachable');
    expect(incidents[0].resolvedAt).toBeNull();
  });

  it('does not raise an incident for an "unknown" service', () => {
    const incidents = deriveIncidents(mapServicesToComponents(null));
    expect(incidents).toEqual([]);
  });
});

describe('getComponentName', () => {
  it('resolves known ids and falls back to the id', () => {
    expect(getComponentName('horizon')).toBe('Horizon API');
    expect(getComponentName('mystery')).toBe('mystery');
  });
});
