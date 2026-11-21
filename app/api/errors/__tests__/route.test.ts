import { POST } from '../route';
import { clearRateLimits } from '@/lib/utils/errorsRateLimit';

function validReport(timestamp = Date.now()) {
  return {
    clientId: 'abc123',
    fingerprint: 'abc123',
    source: 'manual',
    name: 'Error',
    message: 'Test error',
    count: 1,
    context: {
      route: '/dashboard',
      isAuthenticated: false,
      role: null,
      walletConnected: false,
      walletConnector: null,
      walletNetwork: null,
      online: true,
    },
    timestamp,
  };
}

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

function makeRequest(ip = '192.168.1.1', payload: unknown = { errors: [] }) {
  const jsonStr = JSON.stringify(payload);
  return makeRawRequest(ip, jsonStr);
}

function makeRawRequest(ip: string, raw: string) {
  return {
    headers: {
      get(headerName: string) {
        if (headerName === 'x-forwarded-for') return ip;
        if (headerName === 'content-length') return String(raw.length);
        return null;
      },
    },
    text: async () => raw,
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

  it('uses the current time when validating report timestamps', async () => {
    const initialNow = Date.now();
    const currentNow = initialNow + 2 * 86400000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentNow);

    try {
      const res = await POST(
        makeRequest('10.0.0.6', { errors: [validReport(initialNow + 36 * 3600000)] }),
      );

      expect(res.status).toBe(204);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('rejects UTF-8 payloads whose encoded byte size exceeds the limit', async () => {
    const raw = JSON.stringify({
      errors: [],
      extra: 'é'.repeat(66_000),
    });

    expect(raw.length).toBeLessThan(128 * 1024);
    expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(128 * 1024);

    const res = await POST(makeRawRequest('10.0.0.7', raw));

    expect(res.status).toBe(413);
  });
});
