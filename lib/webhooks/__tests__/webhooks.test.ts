/**
 * @jest-environment ./lib/webhooks/jest-node-env.js
 */
import http from 'http';
import type { AddressInfo } from 'net';
import { hmacSha256Hex, signPayload } from '../hmac';
import { validateWebhookUrl } from '../validateUrl';
import {
  listSubscriptions,
  listDlq,
  resetWebhookStore,
  setWebhookState,
  toPublicSubscription,
} from '../store';
import type { WebhookDelivery, WebhookSubscription } from '../types';

jest.mock('@/lib/auth/adminApiGuard', () => ({ guardAdminApi: jest.fn().mockResolvedValue(null) }));

import { GET as listRoute } from '@/app/api/admin/webhooks/route';
import { GET as deliveriesRoute } from '@/app/api/admin/webhooks/[id]/deliveries/route';
import { POST as testRoute } from '@/app/api/admin/webhooks/[id]/test/route';
import { POST as replayRoute } from '@/app/api/admin/webhooks/[id]/replay/route';
import { GET as dlqRoute } from '@/app/api/admin/webhooks/dlq/route';
import { POST as dlqRetryRoute } from '@/app/api/admin/webhooks/dlq/[deliveryId]/retry/route';
import { guardAdminApi } from '@/lib/auth/adminApiGuard';

describe('hmac', () => {
  it('matches the RFC-style known vector for HMAC-SHA256', async () => {
    await expect(
      hmacSha256Hex('key', 'The quick brown fox jumps over the lazy dog'),
    ).resolves.toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });

  it('signs `${timestamp}.${body}`', async () => {
    expect(await signPayload('s', 1700000000, '{"a":1}')).toBe(
      await hmacSha256Hex('s', '1700000000.{"a":1}'),
    );
  });
});

describe('validateWebhookUrl', () => {
  it.each([
    ['https://hooks.example.com/x', true],
    ['http://hooks.example.com/x', false],
    ['ftp://hooks.example.com', false],
    ['not a url', false],
    ['', false],
    ['https://user:pw@hooks.example.com', false],
    ['https://localhost/x', false],
    ['https://127.0.0.1/x', false],
    ['https://10.1.2.3/x', false],
    ['https://192.168.0.5/x', false],
    ['https://172.16.0.1/x', false],
    ['https://169.254.169.254/latest/meta-data', false],
    ['https://[::1]/x', false],
    ['https://[fd00::1]/x', false],
    ['https://metadata.google.internal/', false],
    ['https://8.8.8.8/x', true],
    ['https://172.32.0.1/x', true],
  ])('%s -> %s', (url, valid) => {
    expect(validateWebhookUrl(url).valid).toBe(valid);
  });

  it('allows http loopback only when private targets are permitted', () => {
    expect(validateWebhookUrl('http://localhost:3000/hook').valid).toBe(false);
    expect(validateWebhookUrl('http://localhost:3000/hook', { allowPrivate: true }).valid).toBe(true);
    expect(validateWebhookUrl('http://example.com/hook', { allowPrivate: true }).valid).toBe(false);
  });
});

describe('store: pagination and secrets', () => {
  beforeEach(() => resetWebhookStore());

  it('paginates without overlap or gaps and keeps a stable order', () => {
    const p1 = listSubscriptions(1, 2);
    const p2 = listSubscriptions(2, 2);
    const p3 = listSubscriptions(3, 2);
    const ids = [...p1.data, ...p2.data, ...p3.data].map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(p1.pageInfo.total);
    expect(listSubscriptions(1, 2).data.map((s) => s.id)).toEqual(p1.data.map((s) => s.id));
    expect(p3.pageInfo.hasNextPage).toBe(false);
  });

  it('breaks createdAt ties by id', () => {
    const base = { url: 'https://a.example/h', events: [] as string[], merchantId: null, signingSecret: 'secret-secret', createdAt: '2026-01-01T00:00:00.000Z', lastTestedAt: null, lastTestStatus: null, lastTestStatusCode: null };
    setWebhookState({
      subscriptions: ['c', 'a', 'b'].map((id) => ({ ...base, id }) as WebhookSubscription),
      deliveries: [],
    });
    expect(listSubscriptions(1, 10).data.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('never exposes the full signing secret and computes failure counts', () => {
    const { data } = listSubscriptions(1, 50);
    for (const sub of data) {
      expect(JSON.stringify(sub)).not.toMatch(/whsec_[a-z]+_[0-9a-f]{12}/);
      expect(sub).not.toHaveProperty('signingSecret');
    }
    const whs02 = data.find((s) => s.id === 'whs_02')!;
    expect(whs02.failureCount).toBeGreaterThan(0);
    expect(whs02.consecutiveFailures).toBe(whs02.failureCount);
    expect(toPublicSubscription).toBeDefined();
  });
});

describe('delivery routes against a real local endpoint', () => {
  let server: http.Server;
  let url: string;
  const seen: { headers: http.IncomingHttpHeaders; body: string }[] = [];
  let responses: number[] = [];

  beforeAll(async () => {
    process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = '1';
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ headers: req.headers, body });
        res.statusCode = responses.shift() ?? 200;
        res.end('{}');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`;
  });
  afterAll(() => {
    delete process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS;
    server.close();
  });

  const withId = (id: string) => ({ params: { id } });

  beforeEach(() => {
    seen.length = 0;
    responses = [];
    resetWebhookStore();
    const sub: WebhookSubscription = {
      id: 'whs_live', url, events: ['payment.completed'], merchantId: 'm', signingSecret: 'whsec_live_secret',
      createdAt: new Date().toISOString(), lastTestedAt: null, lastTestStatus: null, lastTestStatusCode: null,
    };
    setWebhookState({ subscriptions: [sub], deliveries: [] });
  });

  it('rejects non-admin callers', async () => {
    (guardAdminApi as jest.Mock).mockResolvedValueOnce(new Response('{}', { status: 403 }));
    const res = await listRoute(new Request('http://x/api/admin/webhooks'));
    expect(res.status).toBe(403);
  });

  it('validates pagination input', async () => {
    expect((await listRoute(new Request('http://x/api/admin/webhooks?page=0'))).status).toBe(400);
    expect((await listRoute(new Request('http://x/api/admin/webhooks?limit=500'))).status).toBe(400);
  });

  it('send test: signs the request and records a real attempt', async () => {
    const res = await testRoute(new Request('http://x'), withId('whs_live'));
    const body = await res.json();
    expect(body.data.status).toBe('delivered');
    expect(body.data.statusCode).toBe(200);
    expect(body.data.latencyMs).toEqual(expect.any(Number));
    expect(body.subscription.lastTestStatus).toBe('success');

    const req = seen[0];
    const ts = req.headers['x-bettapay-timestamp'] as string;
    expect(req.headers['x-bettapay-event']).toBe('webhook.test');
    expect(req.headers['x-bettapay-signature']).toBe(
      `sha256=${await signPayload('whsec_live_secret', ts, req.body)}`,
    );
  });

  it('failed delivery then replay succeeds', async () => {
    responses = [500, 200];

    const first = await (await testRoute(new Request('http://x'), withId('whs_live'))).json();
    expect(first.data.status).toBe('failed');
    expect(first.data.statusCode).toBe(500);
    expect(first.subscription.lastTestStatus).toBe('failed');
    expect(first.subscription.failureCount).toBe(1);

    const replay = await (await replayRoute(new Request('http://x'), withId('whs_live'))).json();
    expect(replay.data.status).toBe('delivered');
    expect(replay.data.statusCode).toBe(200);
    expect(replay.data.replayOf).toBe(first.data.id);
    expect(replay.data.attempt).toBe(2);
    // The replay re-sent the identical payload.
    expect(JSON.parse(seen[1].body)).toEqual(JSON.parse(seen[0].body));

    const history = await (await deliveriesRoute(new Request('http://x'), withId('whs_live'))).json();
    expect(history.data.map((d: WebhookDelivery) => [d.status, d.statusCode])).toEqual([
      ['delivered', 200],
      ['failed', 500],
    ]);
    // eslint-disable-next-line no-console
    console.log('demo: attempt1 =', first.data.status, first.data.statusCode, `${first.data.latencyMs}ms`, '| replay =', replay.data.status, replay.data.statusCode, `${replay.data.latencyMs}ms`);
  });

  it('replay with no deliveries is a 409; unknown subscription is a 404', async () => {
    expect((await replayRoute(new Request('http://x'), withId('whs_live'))).status).toBe(409);
    expect((await replayRoute(new Request('http://x'), withId('nope'))).status).toBe(404);
    expect((await testRoute(new Request('http://x'), withId('bad id!'))).status).toBe(400);
  });

  it('records a transport failure as a failed attempt with no status code', async () => {
    setWebhookState({
      subscriptions: [{ id: 'whs_down', url: 'http://127.0.0.1:1/hook', events: [], merchantId: null, signingSecret: 'whsec_down_secret', createdAt: new Date().toISOString(), lastTestedAt: null, lastTestStatus: null, lastTestStatusCode: null }],
      deliveries: [],
    });
    const body = await (await testRoute(new Request('http://x'), withId('whs_down'))).json();
    expect(body.data.status).toBe('failed');
    expect(body.data.statusCode).toBeNull();
    expect(body.data.error).toMatch(/Request failed/);
  });

  it('blocks private targets when the dev flag is off (SSRF guard)', async () => {
    process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = '0';
    try {
      const body = await (await testRoute(new Request('http://x'), withId('whs_live'))).json();
      expect(body.data.status).toBe('failed');
      expect(body.data.error).toMatch(/^Blocked/);
      expect(seen).toHaveLength(0);
    } finally {
      process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS = '1';
    }
  });

  describe('dead-letter queue', () => {
    const dead = (): WebhookDelivery => ({
      id: 'dlv_dead', subscriptionId: 'whs_live', event: 'payment.completed',
      payload: { id: 'evt_1', type: 'payment.completed' }, status: 'dead', statusCode: 503,
      latencyMs: 900, attempt: 5, error: 'Endpoint returned HTTP 503', createdAt: new Date().toISOString(), replayOf: null,
    });
    it('lists dead letters, keeps them on a failed retry, removes them on success', async () => {
      const sub = { id: 'whs_live', url, events: [], merchantId: null, signingSecret: 'whsec_live_secret', createdAt: new Date().toISOString(), lastTestedAt: null, lastTestStatus: null, lastTestStatusCode: null } as WebhookSubscription;
      setWebhookState({ subscriptions: [sub], deliveries: [dead()] });

      const list = await (await dlqRoute()).json();
      expect(list.total).toBe(1);
      expect(list.data[0].subscriptionUrl).toBe(url);

      responses = [502, 200];
      const first = await (await dlqRetryRoute(new Request('http://x'), { params: { deliveryId: 'dlv_dead' } })).json();
      expect(first.resolved).toBe(false);
      expect(listDlq()).toHaveLength(1);

      const second = await (await dlqRetryRoute(new Request('http://x'), { params: { deliveryId: 'dlv_dead' } })).json();
      expect(second.resolved).toBe(true);
      expect(second.data.statusCode).toBe(200);
      expect(listDlq()).toHaveLength(0);

      const again = await dlqRetryRoute(new Request('http://x'), { params: { deliveryId: 'dlv_dead' } });
      expect(again.status).toBe(404);
    });
  });
});
