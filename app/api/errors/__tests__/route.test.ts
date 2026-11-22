import { POST } from '../route';
import { clearRateLimits } from '@/lib/utils/errorsRateLimit';

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

function makeRequest(
  ip = '192.168.1.1',
  payload: unknown = { errors: [] },
  rawOverride?: string,
  contentLength?: string | null,
) {
  const jsonStr = rawOverride ?? JSON.stringify(payload);
  const advertisedLength = contentLength === undefined ? String(jsonStr.length) : contentLength;
  return {
    headers: {
      get(headerName: string) {
        if (headerName === 'x-forwarded-for') return ip;
        if (headerName === 'content-length') return advertisedLength;
        return null;
      },
    },
    text: async () => jsonStr,
  } as unknown as Request;
}

function validReport(timestamp: number) {
  return {
    clientId: 'abc123',
    fingerprint: 'deadbeef',
    source: 'boundary',
    name: 'TypeError',
    message: 'boom',
    count: 1,
    context: {
      route: '/dashboard',
      isAuthenticated: true,
      role: 'merchant',
      walletConnected: false,
      walletConnector: null,
      walletNetwork: null,
      online: true,
    },
    timestamp,
  };
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

  it('allows requests again once the rate-limit window has expired', async () => {
    const now = Date.now();
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);
    const req = makeRequest('10.0.0.6');

    for (let i = 0; i < 10; i++) {
      await POST(req);
    }
    expect((await POST(req)).status).toBe(429);

    dateNow.mockReturnValue(now + 61_000);

    expect((await POST(req)).status).not.toBe(429);
    dateNow.mockRestore();
  });

  it('accepts a report timestamp relative to the current time, not module load', async () => {
    const later = Date.now() + 3 * 86400000;
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(later);

    const accepted = await POST(
      makeRequest('10.0.0.7', { errors: [validReport(later)] }),
    );
    expect(accepted.status).toBe(204);

    const rejected = await POST(
      makeRequest('10.0.0.8', { errors: [validReport(later + 86400000 + 1000)] }),
    );
    expect(rejected.status).toBe(400);

    dateNow.mockRestore();
  });

  it('returns 413 when the UTF-8 byte length exceeds the cap but the character length does not', async () => {
    // "é" is one UTF-16 code unit and two UTF-8 bytes. 100_000 of them stay
    // under the 128KB character check and over the 128KB byte cap.
    const raw = `é`.repeat(100_000);
    expect(raw.length).toBeLessThan(128 * 1024);
    expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(128 * 1024);

    const res = await POST(
      makeRequest('10.0.0.9', undefined, raw, String(raw.length)),
    );

    expect(res.status).toBe(413);
  });
});
