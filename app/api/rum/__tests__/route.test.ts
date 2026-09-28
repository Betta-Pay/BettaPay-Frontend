import { clearEvents, getEventCount, queryEvents } from '@/lib/rum/store';

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

import { POST } from '../route';

function makeRequest(body: unknown) {
  return {
    headers: {
      get() { return null; },
    },
    json: async () => body,
  } as unknown as Request;
}

function makeRequestWithContentLength(body: unknown, contentLength: string) {
  return {
    headers: {
      get(name: string) { return name === 'content-length' ? contentLength : null; },
    },
    json: async () => body,
  } as unknown as Request;
}

function makeValidBatch() {
  return {
    events: [
      {
        clientId: 'abc123def456',
        route: '/dashboard',
        name: 'fcp',
        value: 150,
        timestamp: Date.now(),
      },
    ],
  };
}

describe('POST /api/rum', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('accepts valid RUM events and returns 204', async () => {
    const req = makeRequest(makeValidBatch());
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(getEventCount()).toBe(1);
  });

  it('accepts multiple events in a batch', async () => {
    const req = makeRequest({
      events: [
        { ...makeValidBatch().events[0], name: 'fcp' },
        { ...makeValidBatch().events[0], name: 'lcp', value: 200 },
        { ...makeValidBatch().events[0], name: 'cls', value: 0.1 },
      ],
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
    expect(getEventCount()).toBe(3);
  });

  it('rejects invalid JSON', async () => {
    const req = {
      headers: { get: () => null },
      json: async () => { throw new SyntaxError('Unexpected token'); },
    } as unknown as Request;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects empty events array', async () => {
    const req = makeRequest({ events: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid metric name', async () => {
    const req = makeRequest({
      events: [{ ...makeValidBatch().events[0], name: 'invalid_metric' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects non-numeric metric value', async () => {
    const req = makeRequest({
      events: [{ ...makeValidBatch().events[0], value: 'not a number' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects invalid clientId format', async () => {
    const req = makeRequest({
      events: [{ ...makeValidBatch().events[0], clientId: 'not-hex!' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const req = makeRequest({
      events: [{ clientId: 'abc123', route: '/test' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects unknown fields in event (strict mode)', async () => {
    const req = makeRequest({
      events: [{ ...makeValidBatch().events[0], pii: 'should-not-be-allowed' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects unknown fields in batch payload (strict mode)', async () => {
    const req = makeRequest({
      events: makeValidBatch().events,
      metadata: { shouldNot: 'be allowed' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('normalizes route in stored events', async () => {
    const req = makeRequest({
      events: [{ ...makeValidBatch().events[0], route: '/dashboard?foo=bar#section' }],
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
    const stored = queryEvents({});
    expect(stored[0].route).toBe('/dashboard');
  });

  it('rejects oversized batch (more than 50 events)', async () => {
    const events = Array.from({ length: 51 }, () => makeValidBatch().events[0]);
    const req = makeRequest({ events });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rejects oversized payload via content-length', async () => {
    const req = makeRequestWithContentLength(makeValidBatch(), '999999999');
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('handles non-fatal errors gracefully', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect([204, 400]).toContain(res.status);
  });

  it('returns no PII in error responses', async () => {
    const req = makeRequest({
      events: [{ invalid: true }],
    });
    const res = await POST(req);
    const body = (res as unknown as { body: string }).body;
    expect(body).not.toContain('email');
    expect(body).not.toContain('token');
    expect(body).not.toContain('password');
  });
});
