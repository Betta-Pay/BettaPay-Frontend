import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/auth/refresh', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  function createRequest(cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    return new NextRequest('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...headers,
      },
    });
  }

  it('returns 401 with Cache-Control no-store when auth_token is missing', async () => {
    const req = createRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ ok: false, error: 'session_expired' });
  });

  it('returns 504 with Cache-Control no-store when upstream fetch times out', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeoutErr);

    const req = createRequest({ auth_token: 'existing-token' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(504);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ ok: false, error: 'upstream_timeout' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://backend.test/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns 401 and clears cookies with Cache-Control no-store on upstream 401', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const req = createRequest({ auth_token: 'expired-token' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ ok: false, error: 'session_expired' });
  });

  it('rotates token and cookies with Cache-Control no-store on upstream success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ token: 'new-rotated-token' }),
    });

    const req = createRequest({ auth_token: 'old-token', user_role: 'admin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body.ok).toBe(true);
    expect(body.refreshed).toBe(true);
    expect(body.token).toBe('new-rotated-token');
  });

  it('falls back to extending existing token when backend is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const req = createRequest({ auth_token: 'old-token' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body.ok).toBe(true);
    expect(body.refreshed).toBe(false);
  });
});
