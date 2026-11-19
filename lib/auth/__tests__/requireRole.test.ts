import { requireRole, requireRoleFromCookies, verifyRoleFromCookieHeader } from '../requireRole';
import type { NextRequest } from 'next/server';

let mockCookieJar: Record<string, string> | null = {};

jest.mock('next/headers', () => ({
  cookies: () => {
    if (mockCookieJar === null) throw new Error('outside a request scope');
    const jar = mockCookieJar;
    return {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
    };
  },
}));

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.mock-signature`;
}

describe('lib/auth/requireRole', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieJar = {};
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  describe('Missing auth_token', () => {
    it('returns 401 when no auth_token is present in cookie header', async () => {
      const result = await verifyRoleFromCookieHeader('theme=dark; session=1', 'admin');
      expect(result).toEqual({
        ok: false,
        role: null,
        status: 401,
        reason: 'not authenticated',
      });
    });
  });

  describe('Self-loop mode (local/mock with JWT inspection)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
    });

    it('rejects expired JWT in verifyRoleFromCookieHeader and returns 401', async () => {
      const past = Math.floor(Date.now() / 1000) - 3600;
      const expiredToken = makeJwt({ role: 'admin', exp: past });
      const result = await verifyRoleFromCookieHeader(`auth_token=${expiredToken}`, 'admin');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.reason).toBe('session expired');
      expect(result.role).toBeNull();
    });

    it('rejects malformed JWT and returns 401', async () => {
      const result = await verifyRoleFromCookieHeader('auth_token=not.a.valid.jwt', 'admin');
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.reason).toBe('session rejected');
    });

    it('allows valid unexpired admin JWT when admin role is required', async () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const validToken = makeJwt({ role: 'admin', exp: future });
      const result = await verifyRoleFromCookieHeader(`auth_token=${validToken}`, 'admin');

      expect(result).toEqual({
        ok: true,
        role: 'admin',
        status: 200,
      });
    });

    it('rejects valid unexpired merchant JWT when admin role is required', async () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      const validToken = makeJwt({ role: 'merchant', exp: future });
      const result = await verifyRoleFromCookieHeader(`auth_token=${validToken}`, 'admin');

      expect(result).toEqual({
        ok: false,
        role: 'merchant',
        status: 403,
        reason: 'requires admin role',
      });
    });
  });

  describe('Upstream fetch verification (non-self-loop mode)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
    });

    it('attaches AbortSignal.timeout(5000) and passes signal to fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ role: 'admin' }),
      } as Response);

      const result = await verifyRoleFromCookieHeader('auth_token=mock_token', 'admin');

      expect(result).toEqual({
        ok: true,
        role: 'admin',
        status: 200,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.test/api/auth/session',
        expect.objectContaining({
          method: 'POST',
          signal: expect.any(AbortSignal),
          cache: 'no-store',
        }),
      );
    });

    it('aborts and fails closed with status 403 on slow/hung upstream request', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'TimeoutError';
      global.fetch = jest.fn().mockRejectedValue(abortError);

      const result = await verifyRoleFromCookieHeader('auth_token=mock_token', 'admin');

      expect(result).toEqual({
        ok: false,
        role: null,
        status: 403,
        reason: 'role could not be verified',
      });
    });

    it('returns 401 when upstream rejects session with 401 or 403', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'unauthorized' }),
      } as Response);

      const result = await verifyRoleFromCookieHeader('auth_token=invalid_token', 'admin');

      expect(result).toEqual({
        ok: false,
        role: null,
        status: 401,
        reason: 'session rejected',
      });
    });

    it('returns 403 when upstream confirms a different role than required', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user: { role: 'merchant' } }),
      } as Response);

      const result = await verifyRoleFromCookieHeader('auth_token=merchant_token', 'admin');

      expect(result).toEqual({
        ok: false,
        role: 'merchant',
        status: 403,
        reason: 'requires admin role',
      });
    });
  });

  describe('requireRole & requireRoleFromCookies helpers', () => {
    it('requireRole reads cookie from request headers', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
      const future = Math.floor(Date.now() / 1000) + 3600;
      const validToken = makeJwt({ role: 'admin', exp: future });
      const req = {
        headers: new Headers({ cookie: `auth_token=${validToken}` }),
      } as unknown as NextRequest;

      const result = await requireRole(req, 'admin');
      expect(result.ok).toBe(true);
      expect(result.role).toBe('admin');
    });

    it('requireRoleFromCookies reads cookies from next/headers', async () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
      const future = Math.floor(Date.now() / 1000) + 3600;
      const validToken = makeJwt({ role: 'admin', exp: future });
      mockCookieJar = { auth_token: validToken };

      const result = await requireRoleFromCookies('admin');
      expect(result.ok).toBe(true);
      expect(result.role).toBe('admin');
    });

    it('requireRoleFromCookies fails closed when next/headers throws outside request scope', async () => {
      mockCookieJar = null;
      const result = await requireRoleFromCookies('admin');
      expect(result).toEqual({
        ok: false,
        role: null,
        status: 403,
        reason: 'role could not be verified',
      });
    });
  });
});
