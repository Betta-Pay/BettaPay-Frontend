jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return { status: init?.status ?? 200, json: async () => data };
    },
  },
}));
const mockGuard = jest.fn();
jest.mock('@/lib/auth/adminApiGuard', () => ({ guardAdminApi: () => mockGuard() }));

import { GET } from '../route';
import { PATCH } from '../[section]/route';
import { GET as HISTORY } from '../history/route';
import { resetSettings } from '@/lib/settings/store';
import { queryAudit, resetAuditStore } from '@/lib/audit/store';

const req = (body: unknown, headers: Record<string, string> = {}) =>
  ({ json: async () => body, headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } }) as unknown as Request;
const patch = (section: string, body: unknown, headers?: Record<string, string>) =>
  PATCH(req(body, headers), { params: { section } });
const settingsAudit = () => queryAudit({ action: 'SETTINGS_UPDATE' }, { limit: 100 }).data;

beforeEach(() => {
  mockGuard.mockResolvedValue(null);
  resetSettings();
  resetAuditStore();
});

describe('admin settings routes', () => {
  it('denies non-admins', async () => {
    mockGuard.mockResolvedValue({ status: 403, json: async () => ({}) });
    expect((await GET()).status).toBe(403);
    expect((await patch('fees', {})).status).toBe(403);
  });

  it('persists a valid PATCH and audits only that section before/after', async () => {
    const before = settingsAudit().length;
    const res = await patch('fees', { defaultBps: 150, capUsdc: 300, minFeeUsdc: 0.1 }, { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });
    expect(res.status).toBe(200);

    const all = (await (await GET()).json()) as { data: { fees: { defaultBps: number; version: number } } };
    expect(all.data.fees.defaultBps).toBe(150);
    expect(all.data.fees.version).toBe(1);

    const entries = settingsAudit();
    expect(entries).toHaveLength(before + 1);
    expect(entries[0]).toMatchObject({
      action: 'SETTINGS_UPDATE',
      entityType: 'PLATFORM_SETTINGS',
      entityId: 'fees',
      ipAddress: '203.0.113.9',
      changes: { before: { defaultBps: 100, capUsdc: 250, minFeeUsdc: 0.1 }, after: { defaultBps: 150, capUsdc: 300, minFeeUsdc: 0.1 } },
    });
  });

  it('returns 400 with field errors and writes no audit entry for invalid input', async () => {
    const before = settingsAudit().length;
    const res = await patch('authPolicy', { ipScoreThreshold: 0, lockoutMaxFailures: 5, lockoutMinutes: 15 });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { fields: Record<string, string> }).fields.ipScoreThreshold).toBeTruthy();
    expect(settingsAudit()).toHaveLength(before);
  });

  it('404s an unknown section', async () => {
    expect((await patch('nope', {})).status).toBe(404);
  });

  it('a simulated failure returns 500 and leaves the store and audit log untouched', async () => {
    const before = settingsAudit().length;
    const res = await patch('fees', { defaultBps: 999, capUsdc: 250, minFeeUsdc: 0 }, { 'x-simulate-failure': '1' });
    expect(res.status).toBe(500);
    const all = (await (await GET()).json()) as { data: { fees: { defaultBps: number; version: number } } };
    expect(all.data.fees).toMatchObject({ defaultBps: 100, version: 0 });
    expect(settingsAudit()).toHaveLength(before);
  });

  it('history returns SETTINGS_UPDATE entries newest first', async () => {
    await patch('maintenance', { enabled: true, message: 'Back soon', readOnlyMode: false });
    const body = (await (await HISTORY()).json()) as { data: Array<{ entityId: string }> };
    expect(body.data[0].entityId).toBe('maintenance');
  });
});
