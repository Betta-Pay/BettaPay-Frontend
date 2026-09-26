import { clearRateLimits, POST } from '../route';

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Map<string, string>;
    body: unknown;

    constructor(body: unknown, init?: ResponseInit) {
      this.status = init?.status ?? 200;
      this.body = body;
      const headersRecord = (init?.headers as Record<string, string>) || {};
      this.headers = new Map(Object.entries(headersRecord));
    }

    static json(data: unknown, init?: ResponseInit) {
      const resp = new MockNextResponse(JSON.stringify(data), init);
      resp.headers.set('content-type', 'application/json');
      return resp;
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

function makeRequest(ip = '192.168.1.1', payload = { errors: [] }) {
  const jsonStr = JSON.stringify(payload);
  return {
    headers: {
      get(headerName: string) {
        if (headerName === 'x-forwarded-for') return ip;
        if (headerName === 'content-length') return String(jsonStr.length);
        return null;
      },
    },
    text: async () => jsonStr,
  } as unknown as Request;
}

describe('POST /api/errors rate limiting', () => {
  beforeEach(() => {
    clearRateLimits();
  });

  it('allows up to 10 requests per minute from a single IP', async () => {
    const req = makeRequest('10.0.0.1');

    for (let i = 0; i < 10; i++) {
      const res = await POST(req);
      expect(res.status).not.toBe(429);
    }
  });

  it('returns 429 Too Many Requests on the 11th request from the same IP', async () => {
    const ip = '10.0.0.2';
    const req = makeRequest(ip);

    for (let i = 0; i < 10; i++) {
      const res = await POST(req);
      expect(res.status).not.toBe(429);
    }

    const rateLimitedRes = await POST(req);
    expect(rateLimitedRes.status).toBe(429);
    expect((rateLimitedRes as unknown as { headers: Map<string, string> }).headers.get('Retry-After')).toBeDefined();
  });

  it('returns 429 Too Many Requests for excess calls when submitting 20 requests instantly', async () => {
    const ip = '10.0.0.3';
    const req = makeRequest(ip);
    const responses: Array<{ status: number }> = [];

    for (let i = 0; i < 20; i++) {
      const res = await POST(req);
      responses.push(res);
    }

    const allowed = responses.slice(0, 10);
    const blocked = responses.slice(10);

    allowed.forEach((res) => expect(res.status).not.toBe(429));
    blocked.forEach((res) => expect(res.status).toBe(429));
  });

  it('tracks rate limits per IP independently', async () => {
    const req1 = makeRequest('10.0.0.4');
    const req2 = makeRequest('10.0.0.5');

    for (let i = 0; i < 10; i++) {
      await POST(req1);
    }

    expect((await POST(req1)).status).toBe(429);
    expect((await POST(req2)).status).not.toBe(429);
  });
});
