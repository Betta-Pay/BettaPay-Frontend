/**
 * Unit tests for the merchant API service layer — business logic that used to
 * live inline in the route handlers under app/api/merchants.
 */

import {
  DEFAULT_ACTIVITY_LIMIT,
  buildMockActivityEvents,
  canManageTeam,
  filterActivityEvents,
  inviteTeamMember,
  isSelfLoop,
  listMerchantActivity,
  listTeamMembers,
  paginateActivityEvents,
  parseActivityLimit,
  resolveUpstreamBase,
  type ActivityEvent,
} from '../merchantService';

function event(id: string, type: ActivityEvent['type'], timestamp: string): ActivityEvent {
  return {
    id,
    type,
    title: id,
    description: id,
    timestamp,
    detailHref: '/',
  };
}

const MIXED_EVENTS: ActivityEvent[] = [
  event('p1', 'payment_received', '2026-01-04T00:00:00.000Z'),
  event('s1', 'settlement_initiated', '2026-01-03T00:00:00.000Z'),
  event('w1', 'webhook_delivered', '2026-01-02T00:00:00.000Z'),
  event('s2', 'settlement_completed', '2026-01-01T00:00:00.000Z'),
  event('p2', 'payment_received', '2025-12-31T00:00:00.000Z'),
];

describe('merchantService — activity', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('parseActivityLimit', () => {
    it('uses numeric limits as-is', () => {
      expect(parseActivityLimit('5')).toBe(5);
      expect(parseActivityLimit(7)).toBe(7);
    });

    it('falls back to the default for missing or invalid limits', () => {
      expect(parseActivityLimit(null)).toBe(DEFAULT_ACTIVITY_LIMIT);
      expect(parseActivityLimit(undefined)).toBe(DEFAULT_ACTIVITY_LIMIT);
      expect(parseActivityLimit('')).toBe(DEFAULT_ACTIVITY_LIMIT);
      expect(parseActivityLimit('abc')).toBe(DEFAULT_ACTIVITY_LIMIT);
      expect(parseActivityLimit('0')).toBe(DEFAULT_ACTIVITY_LIMIT);
      expect(parseActivityLimit('-3')).toBe(DEFAULT_ACTIVITY_LIMIT);
    });
  });

  describe('upstream resolution', () => {
    it('prefers an explicit base over the environment', () => {
      expect(resolveUpstreamBase('https://api.example.com')).toBe('https://api.example.com');
    });

    it('defaults to localhost when no base is configured', () => {
      const previous = process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_API_URL;
      try {
        expect(resolveUpstreamBase()).toBe('http://localhost:3001');
      } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
        else process.env.NEXT_PUBLIC_API_URL = previous;
      }
    });

    it('treats loopback upstreams as self-loops and remote hosts as real', () => {
      expect(isSelfLoop('http://localhost:3001')).toBe(true);
      expect(isSelfLoop('http://127.0.0.1:3001')).toBe(true);
      expect(isSelfLoop('https://api.bettapay.com')).toBe(false);
    });
  });

  describe('buildMockActivityEvents', () => {
    it('returns unique ids ordered newest first relative to the clock', () => {
      const now = new Date('2026-06-01T12:00:00.000Z');
      const events = buildMockActivityEvents(now);

      expect(events.length).toBeGreaterThan(0);
      expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
      expect(events.every((e) => Date.parse(e.timestamp) <= now.getTime())).toBe(true);
      expect(Date.parse(events[0].timestamp)).toBeGreaterThanOrEqual(
        Date.parse(events[events.length - 1].timestamp),
      );
    });
  });

  describe('filterActivityEvents', () => {
    it('keeps only the requested family', () => {
      expect(filterActivityEvents(MIXED_EVENTS, 'payments').map((e) => e.id)).toEqual(['p1', 'p2']);
      expect(filterActivityEvents(MIXED_EVENTS, 'settlements').map((e) => e.id)).toEqual([
        's1',
        's2',
      ]);
      expect(filterActivityEvents(MIXED_EVENTS, 'webhooks').map((e) => e.id)).toEqual(['w1']);
    });

    it('returns everything for `all`, unknown or missing filters', () => {
      expect(filterActivityEvents(MIXED_EVENTS, 'all')).toHaveLength(MIXED_EVENTS.length);
      expect(filterActivityEvents(MIXED_EVENTS, 'nonsense')).toHaveLength(MIXED_EVENTS.length);
      expect(filterActivityEvents(MIXED_EVENTS, null)).toHaveLength(MIXED_EVENTS.length);
      expect(filterActivityEvents(MIXED_EVENTS)).toHaveLength(MIXED_EVENTS.length);
    });
  });

  describe('paginateActivityEvents', () => {
    it('walks pages by cursor and stops at the end', () => {
      const page1 = paginateActivityEvents(MIXED_EVENTS, { limit: 2 });
      expect(page1.data.map((e) => e.id)).toEqual(['p1', 's1']);
      expect(page1.nextCursor).toBe('s1');

      const page2 = paginateActivityEvents(MIXED_EVENTS, { limit: 2, cursor: 's1' });
      expect(page2.data.map((e) => e.id)).toEqual(['w1', 's2']);
      expect(page2.nextCursor).toBe('s2');

      const page3 = paginateActivityEvents(MIXED_EVENTS, { limit: 2, cursor: 's2' });
      expect(page3.data.map((e) => e.id)).toEqual(['p2']);
      expect(page3.nextCursor).toBeNull();
    });

    it('restarts from the first page when the cursor is unknown', () => {
      const page = paginateActivityEvents(MIXED_EVENTS, { limit: 2, cursor: 'nope' });
      expect(page.data.map((e) => e.id)).toEqual(['p1', 's1']);
      expect(page.nextCursor).toBe('s1');
    });

    it('reports no next cursor when everything fits on one page', () => {
      const page = paginateActivityEvents(MIXED_EVENTS, { limit: 50 });
      expect(page.data).toHaveLength(MIXED_EVENTS.length);
      expect(page.nextCursor).toBeNull();
    });
  });

  describe('listMerchantActivity', () => {
    it('serves the mock feed without touching fetch when upstream is a self-loop', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const page = await listMerchantActivity({
        merchantId: 'm1',
        upstreamBase: 'http://localhost:3001',
        limit: '5',
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(page.data).toHaveLength(5);
      expect(page.nextCursor).toBe(page.data[page.data.length - 1].id);
    });

    it('aggregates upstream sources newest-first and forwards the cookie', async () => {
      const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/payments')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'pay-1',
                  amountUsdc: 12.5,
                  payerAddress: 'GBXABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
                  source: 'API',
                  createdAt: '2026-01-02T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        if (url.endsWith('/api/settlements')) {
          return {
            ok: true,
            json: async () => [
              {
                id: 'set-1',
                status: 'COMPLETED',
                amountUsdc: 100,
                bankName: 'GTBank',
                createdAt: '2026-01-03T00:00:00.000Z',
              },
            ],
          };
        }
        if (url.endsWith('/api/webhooks/attempts')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'hook-1',
                  eventType: 'payment.succeeded',
                  targetUrl: 'https://api.acme.com/webhook',
                  createdAt: '2026-01-01T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        if (url.endsWith('/api/auth/sessions')) {
          return {
            ok: true,
            json: async () => ({
              active: [
                {
                  id: 'sess-1',
                  ipAddress: '1.2.3.4',
                  userAgent: 'jest',
                  createdAt: '2026-01-04T00:00:00.000Z',
                },
              ],
              history: [],
            }),
          };
        }
        return { ok: false, json: async () => ({}) };
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const page = await listMerchantActivity({
        merchantId: 'm2',
        upstreamBase: 'https://api.bettapay.com',
        cookie: 'auth_token=tok',
        limit: '10',
      });

      expect(page.data.map((e) => e.id)).toEqual(['auth-sess-1', 'set-1', 'pay-1', 'hook-1']);
      expect(page.data[0].type).toBe('api_key_used');
      expect(page.data[1].type).toBe('settlement_completed');
      expect(page.data[2].description).toBe('$12.50 USDC received from GBXA...4567 (API)');
      expect(page.data[3].description).toBe('payment.succeeded sent to https://api.acme.com/webhook');
      expect(page.nextCursor).toBeNull();

      expect(fetchMock).toHaveBeenCalledWith('https://api.bettapay.com/api/payments', {
        headers: { cookie: 'auth_token=tok' },
      });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('degrades to the other sources when one upstream call fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/settlements')) throw new Error('boom');
        if (url.endsWith('/api/payments')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'pay-2',
                  amountUsdc: 1,
                  payerAddress: null,
                  source: 'Payment Link',
                  createdAt: '2026-02-01T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const page = await listMerchantActivity({
        merchantId: 'm3',
        upstreamBase: 'https://api.bettapay.com',
      });

      expect(page.data.map((e) => e.id)).toEqual(['pay-2']);
      expect(page.data[0].description).toContain('unknown');
    });

    it('applies filter and cursor pagination on top of upstream results', async () => {
      const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/payments')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'pay-a',
                  amountUsdc: 1,
                  payerAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                  createdAt: '2026-03-02T00:00:00.000Z',
                },
                {
                  id: 'pay-b',
                  amountUsdc: 2,
                  payerAddress: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
                  createdAt: '2026-03-01T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        if (url.endsWith('/api/settlements')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'set-a',
                  status: 'PENDING',
                  amountUsdc: 5,
                  createdAt: '2026-03-03T00:00:00.000Z',
                },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const first = await listMerchantActivity({
        merchantId: 'm4',
        upstreamBase: 'https://api.bettapay.com',
        filter: 'payments',
        limit: '1',
      });
      expect(first.data.map((e) => e.id)).toEqual(['pay-a']);
      expect(first.nextCursor).toBe('pay-a');

      const second = await listMerchantActivity({
        merchantId: 'm4',
        upstreamBase: 'https://api.bettapay.com',
        filter: 'payments',
        limit: '1',
        cursor: 'pay-a',
      });
      expect(second.data.map((e) => e.id)).toEqual(['pay-b']);
      expect(second.nextCursor).toBeNull();
    });
  });
});

describe('merchantService — team', () => {
  const uniqueMerchant = (label: string) =>
    `svc-${label}-${Math.random().toString(36).slice(2, 10)}`;

  describe('canManageTeam', () => {
    it('denies viewers and allows everyone else', () => {
      expect(canManageTeam('viewer')).toBe(false);
      expect(canManageTeam('merchant')).toBe(true);
      expect(canManageTeam('admin')).toBe(true);
      expect(canManageTeam(null)).toBe(true);
      expect(canManageTeam(undefined)).toBe(true);
    });
  });

  it('lists the seeded owner for a fresh merchant', () => {
    const merchantId = uniqueMerchant('list');
    const { members, audit } = listTeamMembers(merchantId);

    expect(members).toHaveLength(1);
    expect(members[0].role).toBe('owner');
    expect(audit).toEqual([]);
  });

  it('rejects invites from callers without team.manage', () => {
    const merchantId = uniqueMerchant('forbidden');
    const result = inviteTeamMember({
      merchantId,
      actor: 'viewer@bettapay.com',
      role: 'viewer',
      body: { email: 'someone@example.com', role: 'finance' },
    });

    expect(result).toEqual({
      ok: false,
      code: 'forbidden',
      error: 'You do not have permission to manage the team.',
    });
    expect(listTeamMembers(merchantId).members).toHaveLength(1);
  });

  it('rejects malformed invite payloads with a validation message', () => {
    const merchantId = uniqueMerchant('invalid');

    const missingFields = inviteTeamMember({
      merchantId,
      actor: 'owner@bettapay.com',
      role: 'owner',
      body: {},
    });
    if (missingFields.ok) throw new Error('expected a validation failure');
    expect(missingFields.code).toBe('invalid_body');
    expect(missingFields.error.length).toBeGreaterThan(0);

    expect(
      inviteTeamMember({
        merchantId,
        actor: 'owner@bettapay.com',
        role: 'owner',
        body: { email: 'not-an-email', role: 'finance' },
      }),
    ).toEqual({ ok: false, code: 'invalid_body', error: 'Enter a valid email address.' });

    expect(
      inviteTeamMember({
        merchantId,
        actor: 'owner@bettapay.com',
        role: 'owner',
        body: { email: 'ok@example.com', role: 'superuser' },
      }).ok,
    ).toBe(false);

    expect(listTeamMembers(merchantId).members).toHaveLength(1);
  });

  it('invites a member, normalises the email and records the audit entry', () => {
    const merchantId = uniqueMerchant('invite');
    const result = inviteTeamMember({
      merchantId,
      actor: 'owner@bettapay.com',
      role: 'owner',
      body: { email: 'Finance@Example.COM', role: 'finance' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.member.email).toBe('finance@example.com');
    expect(result.member.role).toBe('finance');
    expect(result.member.status).toBe('pending');

    const { members, audit } = listTeamMembers(merchantId);
    expect(members.map((m) => m.email)).toContain('finance@example.com');
    expect(audit[0]).toMatchObject({
      actor: 'owner@bettapay.com',
      action: 'member.invited',
      targetEmail: 'finance@example.com',
    });
  });

  it('reports a conflict when the email is already on the team', () => {
    const merchantId = uniqueMerchant('dupe');
    const body = { email: 'dev@example.com', role: 'developer' };

    expect(inviteTeamMember({ merchantId, actor: 'owner@bettapay.com', role: 'owner', body }).ok).toBe(
      true,
    );

    const second = inviteTeamMember({
      merchantId,
      actor: 'owner@bettapay.com',
      role: 'owner',
      body: { email: 'DEV@example.com', role: 'developer' },
    });

    expect(second).toEqual({
      ok: false,
      code: 'conflict',
      error: 'That email is already on the team.',
    });
    expect(listTeamMembers(merchantId).members).toHaveLength(2);
  });
});
