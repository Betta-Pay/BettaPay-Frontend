jest.mock('next/server', () => ({
  NextResponse: {
    json(data: unknown, init?: ResponseInit) {
      return {
        status: init?.status ?? 200,
        headers: new Map(Object.entries((init?.headers as Record<string, string>) ?? {})),
        json: async () => data,
      };
    },
  },
}));

import { GET } from '../route';

// jsdom has no Request global; the handler only reads `url` and headers.
const call = (qs: string, ip = '203.0.113.1') =>
  GET({
    url: `http://localhost/api/playground/quote?${qs}`,
    headers: { get: (name: string) => (name === 'x-forwarded-for' ? ip : null) },
  } as unknown as Request);

const upstream = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, text: async () => JSON.stringify(body) } as Response);

describe('GET /api/playground/quote', () => {
  const realFetch = global.fetch;
  const env = { ...process.env };
  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...env };
  });

  it('proxies a valid quote and returns the real upstream body, status and latency', async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(() => upstream(200, { from: 'USDC', to: 'NGN', rate: 1650.42, amount: 50, converted: 82521 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.PLAYGROUND_API_BASE_URL = 'http://fx.test/';

    const res = await call('op=quote&from=usdc&to=NGN&amount=50', '198.51.100.1');
    const body = await res.json();

    expect(fetchMock.mock.calls[0][0]).toBe('http://fx.test/api/quote?from=USDC&to=NGN&amount=50');
    expect(body).toMatchObject({ ok: true, status: 200, request: 'GET /api/quote?from=USDC&to=NGN&amount=50' });
    expect(body.data.converted).toBe(82521);
    expect(typeof body.latencyMs).toBe('number');
  });

  it('sends the dev key upstream but never returns it', async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(() => upstream(200, { rates: [] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env.PLAYGROUND_API_KEY = 'bp_test_secret';

    const res = await call('op=rates', '198.51.100.2');

    expect(((fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>).authorization).toBe('Bearer bp_test_secret');
    expect(JSON.stringify(await res.json())).not.toContain('bp_test_secret');
  });

  it('passes upstream errors through instead of faking data', async () => {
    global.fetch = jest.fn(() => upstream(400, { error: 'bad pair' })) as unknown as typeof fetch;
    const body = await (await call('from=USDC&to=GHS&amount=5', '198.51.100.3')).json();
    expect(body).toMatchObject({ ok: false, status: 400, data: { error: 'bad pair' } });
  });

  it('reports an unreachable upstream as a 502 error with no data', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch;
    const res = await call('from=USDC&to=NGN&amount=5', '198.51.100.4');
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false, status: 0, error: 'The FX service could not be reached.' });
  });

  it('reports a timeout as a 504', async () => {
    const err = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    global.fetch = jest.fn(() => Promise.reject(err)) as unknown as typeof fetch;
    expect((await call('from=USDC&to=NGN&amount=5', '198.51.100.5')).status).toBe(504);
  });

  it.each([
    ['unknown asset', 'from=DOGE&to=NGN&amount=5'],
    ['same pair', 'from=USDC&to=USDC&amount=5'],
    ['zero amount', 'from=USDC&to=NGN&amount=0'],
    ['huge amount', 'from=USDC&to=NGN&amount=999999'],
    ['non-numeric amount', 'from=USDC&to=NGN&amount=1e3'],
    ['unknown op', 'op=drop'],
  ])('rejects %s before calling upstream', async (_name, qs) => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const res = await call(qs, '198.51.100.6');
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate limits a single client', async () => {
    global.fetch = jest.fn(() => upstream(200, {})) as unknown as typeof fetch;
    let last = 200;
    for (let i = 0; i < 21; i += 1) last = (await call('op=rates', '198.51.100.7')).status;
    expect(last).toBe(429);
  });
});
