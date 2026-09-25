import { guardAdminApi } from '../adminApiGuard';

jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return { status: init?.status ?? 200, json: async () => data };
    },
  },
}));

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

function mockBackendRole(role: string | null, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => (role ? { user: { role } } : {}),
  }) as unknown as typeof fetch;
}

describe('guardAdminApi (issue #779)', () => {
  const originalFetch = global.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
    mockCookieJar = { auth_token: 'header.payload.sig' };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  it('allows a session the backend confirms as admin', async () => {
    mockBackendRole('admin');
    await expect(guardAdminApi()).resolves.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/auth/session',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns 403 for a merchant token', async () => {
    mockBackendRole('merchant');
    const res = await guardAdminApi();
    expect(res?.status).toBe(403);
    await expect(res?.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('ignores a forged user_role=admin cookie', async () => {
    mockCookieJar = { auth_token: 'header.payload.sig', user_role: 'admin' };
    mockBackendRole('merchant');
    const res = await guardAdminApi();
    expect(res?.status).toBe(403);
  });

  it('returns 401 when there is no auth token', async () => {
    mockCookieJar = { user_role: 'admin' };
    mockBackendRole('admin');
    const res = await guardAdminApi();
    expect(res?.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 401 when the backend rejects the session', async () => {
    mockBackendRole(null, 401);
    const res = await guardAdminApi();
    expect(res?.status).toBe(401);
  });

  it('fails closed when the auth service is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
    const res = await guardAdminApi();
    expect(res?.status).toBe(403);
  });

  it('fails closed when cookies are unavailable', async () => {
    mockCookieJar = null;
    const res = await guardAdminApi();
    expect(res?.status).toBe(403);
  });
});
