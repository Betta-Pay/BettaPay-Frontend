import {
  countSubscribers,
  findSubscriber,
  generateSubscriberToken,
  listSubscribers,
  resetSubscribers,
} from '@/lib/status/subscribers';

jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        ok: (init?.status ?? 200) < 400,
        headers: new Map(Object.entries((init?.headers as Record<string, string>) ?? {})),
        json: async () => data,
      };
    },
  },
}));

import { GET, POST } from '../route';

/**
 * The subscribe endpoint is what makes the status page's "You're subscribed"
 * message true. These cases follow the flow the issue asks for: subscribe,
 * verify the record exists in storage, then subscribe again and get told.
 */

let ipCounter = 0;

/** A fresh IP per request so the rate limiter does not bleed between cases. */
function makeRequest(body: unknown, url = 'http://localhost/api/status/subscribe') {
  ipCounter += 1;
  return {
    url,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'x-forwarded-for' ? `10.0.0.${ipCounter}` : null,
    },
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  } as unknown as Request;
}

beforeEach(() => {
  resetSubscribers();
});

describe('POST /api/status/subscribe', () => {
  it('creates a verifiable record and acknowledges it', async () => {
    const res = await POST(makeRequest({ email: 'ops@acme.com' }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('created');
    expect(body.id).toEqual(expect.any(String));

    // The record is really in storage, not just reported.
    const stored = findSubscriber('ops@acme.com');
    expect(stored).not.toBeNull();
    expect(stored?.email).toBe('ops@acme.com');
    expect(countSubscribers()).toBe(1);
  });

  it('normalizes case and surrounding whitespace before storing', async () => {
    await POST(makeRequest({ email: '  OPS@Acme.COM ' }));

    expect(listSubscribers().map((s) => s.email)).toEqual(['ops@acme.com']);
  });

  it('reports a duplicate instead of creating a second record', async () => {
    const first = await POST(makeRequest({ email: 'ops@acme.com' }));
    expect(first.status).toBe(201);

    const second = await POST(makeRequest({ email: 'OPS@ACME.COM' }));
    const body = await second.json();

    expect(second.status).toBe(200);
    expect(body.status).toBe('duplicate');
    expect(body.message).toMatch(/already subscribed/i);
    expect(countSubscribers()).toBe(1);
  });

  it.each([
    ['missing @', 'not-an-email'],
    ['empty', ''],
    ['whitespace only', '   '],
    ['not a string', 42],
  ])('rejects an invalid email (%s) and stores nothing', async (_label, email) => {
    const res = await POST(makeRequest({ email }));

    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
    expect(countSubscribers()).toBe(0);
  });

  it('rejects a body that is not JSON', async () => {
    const res = await POST(makeRequest(undefined));

    expect(res.status).toBe(400);
    expect(countSubscribers()).toBe(0);
  });

  it('rate limits repeated attempts from one IP', async () => {
    const ip = '203.0.113.9';
    const request = (email: string) =>
      ({
        url: 'http://localhost/api/status/subscribe',
        headers: { get: (n: string) => (n.toLowerCase() === 'x-forwarded-for' ? ip : null) },
        json: async () => ({ email }),
      }) as unknown as Request;

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await POST(request(`user${i}@acme.com`))).status);
    }

    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});

describe('GET /api/status/subscribe', () => {
  it('reports the subscriber count', async () => {
    await POST(makeRequest({ email: 'a@acme.com' }));
    await POST(makeRequest({ email: 'b@acme.com' }));

    const res = await GET(makeRequest(null));
    expect((await res.json()).count).toBe(2);
  });

  it('confirms whether one address is subscribed', async () => {
    const postRes = await POST(makeRequest({ email: 'ops@acme.com' }));
    const { token } = (await postRes.json()) as { token: string };

    const hit = await GET(
      makeRequest(null, `http://localhost/api/status/subscribe?email=OPS@acme.com&token=${token}`),
    );
    expect((await hit.json()).subscribed).toBe(true);

    const nobodyToken = generateSubscriberToken('nobody@acme.com');
    const miss = await GET(
      makeRequest(null, `http://localhost/api/status/subscribe?email=nobody@acme.com&token=${nobodyToken}`),
    );
    expect((await miss.json()).subscribed).toBe(false);
  });

  it('rejects a malformed lookup address', async () => {
    const res = await GET(
      makeRequest(null, 'http://localhost/api/status/subscribe?email=nonsense'),
    );

    expect(res.status).toBe(400);
  });

  it('never returns the subscriber list', async () => {
    await POST(makeRequest({ email: 'ops@acme.com' }));

    const body = await (await GET(makeRequest(null))).json();
    expect(JSON.stringify(body)).not.toContain('ops@acme.com');
  });
});
