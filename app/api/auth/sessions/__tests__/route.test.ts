import { NextRequest } from 'next/server';
import { GET } from '../route';

describe('GET /api/auth/sessions', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function createRequest(cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    return new NextRequest('http://localhost:3000/api/auth/sessions', {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...headers,
      },
    });
  }

  it('short-circuits and returns 401 with no-store when auth_token is absent', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;

    const req = createRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 504 with no-store when upstream fetch times out', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeoutErr);

    const req = createRequest({ auth_token: 'valid-session-token' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(504);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ error: 'Session service timed out' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/sessions'),
      expect.objectContaining({
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns 503 with no-store when upstream is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    const req = createRequest({ auth_token: 'valid-session-token' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ error: 'Session service unavailable' });
  });

  it('forwards upstream response with no-store when authenticated', async () => {
    const sessionsData = [{ id: 's1', ip: '127.0.0.1', isCurrent: true }];
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(sessionsData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const req = createRequest({ auth_token: 'valid-session-token' });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual(sessionsData);
  });
});
