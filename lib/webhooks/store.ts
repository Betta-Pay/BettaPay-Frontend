import { randomUUID } from 'crypto';
import {
  EVENT_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  signPayload,
} from './hmac';
import { validateWebhookUrl } from './validateUrl';
import type {
  PageInfo,
  PublicWebhookSubscription,
  WebhookDelivery,
  WebhookSubscription,
} from './types';

/**
 * In-memory webhook subscription + delivery store (mirrors the backend
 * `WebhookSubscription` / `IndexedEventWebhookDelivery` models). Held on
 * `globalThis` so it survives dev HMR, like the other admin mock stores.
 */

export const DELIVERY_TIMEOUT_MS = 5000;
const MAX_DELIVERIES = 500;

interface WebhookState {
  subscriptions: WebhookSubscription[];
  /** Newest first. */
  deliveries: WebhookDelivery[];
}

const g = globalThis as unknown as { __bettapayWebhooks?: WebhookState };

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

function seedState(): WebhookState {
  const subs: WebhookSubscription[] = [
    { id: 'whs_01', url: 'https://hooks.acme-stores.example/bettapay', events: ['payment.completed', 'payment.failed'], merchantId: 'merch-001', signingSecret: 'whsec_acme_4f9d2a7c1b8e', createdAt: minutesAgo(60 * 24 * 40), lastTestedAt: minutesAgo(35), lastTestStatus: 'success', lastTestStatusCode: 200 },
    { id: 'whs_02', url: 'https://api.novapay.example/webhooks/in', events: ['settlement.completed', 'settlement.failed'], merchantId: 'merch-002', signingSecret: 'whsec_nova_91c3e5d07a22', createdAt: minutesAgo(60 * 24 * 31), lastTestedAt: minutesAgo(120), lastTestStatus: 'failed', lastTestStatusCode: 500 },
    { id: 'whs_03', url: 'https://ops.lagosmart.example/hooks', events: ['payment.completed'], merchantId: 'merch-003', signingSecret: 'whsec_lagos_0b6a8f3e5c47', createdAt: minutesAgo(60 * 24 * 20), lastTestedAt: null, lastTestStatus: null, lastTestStatusCode: null },
    { id: 'whs_04', url: 'https://example-dead.example/receive', events: ['payment.completed', 'kyb.approved'], merchantId: 'merch-004', signingSecret: 'whsec_dead_7e1d9c4a6b30', createdAt: minutesAgo(60 * 24 * 12), lastTestedAt: minutesAgo(600), lastTestStatus: 'failed', lastTestStatusCode: null },
    { id: 'whs_05', url: 'https://hooks.kenyabazaar.example/bp', events: ['payment.completed', 'settlement.completed', 'kyb.approved'], merchantId: 'merch-005', signingSecret: 'whsec_kenya_2a5f8c1e9d63', createdAt: minutesAgo(60 * 24 * 3), lastTestedAt: minutesAgo(15), lastTestStatus: 'success', lastTestStatusCode: 204 },
  ];

  const d = (
    n: number,
    subscriptionId: string,
    event: string,
    status: WebhookDelivery['status'],
    statusCode: number | null,
    latencyMs: number | null,
    attempt: number,
    error: string | null,
    ageMin: number,
  ): WebhookDelivery => ({
    id: `dlv_seed_${String(n).padStart(2, '0')}`,
    subscriptionId,
    event,
    payload: { id: `evt_seed_${n}`, type: event, createdAt: minutesAgo(ageMin), data: { amountUsdc: 25 + n } },
    status,
    statusCode,
    latencyMs,
    attempt,
    error,
    createdAt: minutesAgo(ageMin),
    replayOf: null,
  });

  const deliveries: WebhookDelivery[] = [
    d(1, 'whs_05', 'payment.completed', 'delivered', 200, 142, 1, null, 5),
    d(2, 'whs_01', 'payment.completed', 'delivered', 200, 188, 1, null, 12),
    d(3, 'whs_02', 'settlement.failed', 'failed', 500, 640, 1, 'Upstream returned HTTP 500', 22),
    d(4, 'whs_02', 'settlement.completed', 'failed', 500, 702, 2, 'Upstream returned HTTP 500', 40),
    d(5, 'whs_01', 'payment.failed', 'failed', 404, 96, 1, 'Upstream returned HTTP 404', 58),
    d(6, 'whs_04', 'payment.completed', 'failed', null, 5000, 1, `Timed out after ${DELIVERY_TIMEOUT_MS}ms`, 90),
    d(7, 'whs_04', 'payment.completed', 'failed', null, 5000, 2, `Timed out after ${DELIVERY_TIMEOUT_MS}ms`, 150),
    d(8, 'whs_04', 'kyb.approved', 'dead', null, 5000, 5, `Timed out after ${DELIVERY_TIMEOUT_MS}ms`, 300),
    d(9, 'whs_02', 'settlement.completed', 'dead', 503, 1210, 5, 'Upstream returned HTTP 503', 420),
    d(10, 'whs_05', 'settlement.completed', 'delivered', 204, 233, 1, null, 480),
  ];
  return { subscriptions: subs, deliveries };
}

function state(): WebhookState {
  if (!g.__bettapayWebhooks) g.__bettapayWebhooks = seedState();
  return g.__bettapayWebhooks;
}

/** Test helper: restore the seeded state. */
export function resetWebhookStore(): void {
  g.__bettapayWebhooks = seedState();
}

/** Test helper: replace the state wholesale. */
export function setWebhookState(next: WebhookState): void {
  g.__bettapayWebhooks = next;
}

export function allowPrivateTargets(): boolean {
  return process.env.WEBHOOK_ALLOW_PRIVATE_TARGETS === '1';
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export function maskSecret(secret: string): string {
  return secret.length <= 10 ? '••••' : `${secret.slice(0, 6)}••••${secret.slice(-4)}`;
}

const isFailure = (x: WebhookDelivery) => x.status === 'failed' || x.status === 'dead';

export function toPublicSubscription(sub: WebhookSubscription): PublicWebhookSubscription {
  const { signingSecret, ...rest } = sub;
  const mine = state().deliveries.filter((x) => x.subscriptionId === sub.id);
  let consecutive = 0;
  for (const x of mine) {
    if (x.status === 'delivered') break;
    if (isFailure(x)) consecutive += 1;
  }
  return {
    ...rest,
    signingSecretMasked: maskSecret(signingSecret),
    failureCount: mine.filter(isFailure).length,
    consecutiveFailures: consecutive,
    deliveryCount: mine.length,
  };
}

export function getSubscription(id: string): WebhookSubscription | undefined {
  return state().subscriptions.find((s) => s.id === id);
}

/** Stable order: newest first, id as the tiebreaker so pages never overlap. */
export function listSubscriptions(page: number, limit: number): {
  data: PublicWebhookSubscription[];
  pageInfo: PageInfo;
} {
  const sorted = [...state().subscriptions].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? 1 : -1,
  );
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    data: sorted.slice(start, start + limit).map(toPublicSubscription),
    pageInfo: { page, limit, total, totalPages, hasNextPage: page < totalPages },
  };
}

export function listDeliveries(subscriptionId: string, limit = 25): WebhookDelivery[] {
  return state()
    .deliveries.filter((x) => x.subscriptionId === subscriptionId)
    .slice(0, limit);
}

export function listDlq(): WebhookDelivery[] {
  return state().deliveries.filter((x) => x.status === 'dead' && !x.resolvedBy);
}

// ─── Delivery ────────────────────────────────────────────────────────────────

export interface SendOptions {
  attempt?: number;
  replayOf?: string | null;
}

/**
 * Performs a real signed HTTP POST to the subscription URL and records the
 * attempt. A transport error or non-2xx response is a failed delivery, not a
 * thrown error.
 */
export async function sendDelivery(
  sub: WebhookSubscription,
  event: string,
  payload: Record<string, unknown>,
  opts: SendOptions = {},
): Promise<WebhookDelivery> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const delivery: WebhookDelivery = {
    id: `dlv_${randomUUID().slice(0, 12)}`,
    subscriptionId: sub.id,
    event,
    payload,
    status: 'pending',
    statusCode: null,
    latencyMs: null,
    attempt: opts.attempt ?? 1,
    error: null,
    createdAt: new Date().toISOString(),
    replayOf: opts.replayOf ?? null,
  };

  const check = validateWebhookUrl(sub.url, { allowPrivate: allowPrivateTargets() });
  if (!check.valid) {
    delivery.status = 'failed';
    delivery.error = `Blocked: ${check.reason}`;
    record(delivery);
    return delivery;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  const started = performance.now();
  try {
    const signature = await signPayload(sub.signingSecret, timestamp, body);
    const res = await fetch(sub.url, {
      method: 'POST',
      redirect: 'manual', // never follow a redirect into an internal host
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        [SIGNATURE_HEADER]: `sha256=${signature}`,
        [TIMESTAMP_HEADER]: timestamp,
        [EVENT_HEADER]: event,
      },
      body,
    });
    delivery.latencyMs = Math.round(performance.now() - started);
    delivery.statusCode = res.status;
    if (res.status >= 200 && res.status < 300) {
      delivery.status = 'delivered';
    } else {
      delivery.status = 'failed';
      delivery.error = `Endpoint returned HTTP ${res.status}`;
    }
  } catch (err) {
    delivery.latencyMs = Math.round(performance.now() - started);
    delivery.status = 'failed';
    delivery.error = controller.signal.aborted
      ? `Timed out after ${DELIVERY_TIMEOUT_MS}ms`
      : `Request failed: ${err instanceof Error ? (err.cause as Error | undefined)?.message ?? err.message : 'unknown error'}`;
  } finally {
    clearTimeout(timer);
  }

  record(delivery);
  return delivery;
}

function record(delivery: WebhookDelivery) {
  const s = state();
  s.deliveries.unshift(delivery);
  if (s.deliveries.length > MAX_DELIVERIES) s.deliveries.length = MAX_DELIVERIES;
}

export async function sendTest(id: string): Promise<WebhookDelivery | null> {
  const sub = getSubscription(id);
  if (!sub) return null;
  const now = new Date().toISOString();
  const delivery = await sendDelivery(sub, 'webhook.test', {
    id: `evt_test_${randomUUID().slice(0, 8)}`,
    type: 'webhook.test',
    createdAt: now,
    data: { message: 'Test event sent from the BettaPay admin console.' },
  });
  sub.lastTestedAt = delivery.createdAt;
  sub.lastTestStatus = delivery.status === 'delivered' ? 'success' : 'failed';
  sub.lastTestStatusCode = delivery.statusCode;
  return delivery;
}

export async function replayLatest(id: string): Promise<WebhookDelivery | null | 'no-deliveries'> {
  const sub = getSubscription(id);
  if (!sub) return null;
  const latest = listDeliveries(id, 1)[0];
  if (!latest) return 'no-deliveries';
  return sendDelivery(sub, latest.event, latest.payload, {
    attempt: latest.attempt + 1,
    replayOf: latest.id,
  });
}

export async function retryDlq(
  deliveryId: string,
): Promise<{ delivery: WebhookDelivery; resolved: boolean } | null> {
  const entry = state().deliveries.find((x) => x.id === deliveryId);
  if (!entry || entry.status !== 'dead' || entry.resolvedBy) return null;
  const sub = getSubscription(entry.subscriptionId);
  if (!sub) return null;
  const delivery = await sendDelivery(sub, entry.event, entry.payload, {
    attempt: entry.attempt + 1,
    replayOf: entry.id,
  });
  const resolved = delivery.status === 'delivered';
  if (resolved) entry.resolvedBy = delivery.id;
  return { delivery, resolved };
}
