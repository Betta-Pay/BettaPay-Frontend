/**
 * Server-side store + evaluation for FX rate alerts (issue #469).
 *
 * Process-local `Map` keyed by merchant, same pattern as the notification and
 * newsletter stores. Swap for a `rate_alerts` table before production — the
 * shape here (`StoredAlert`) is the table row.
 *
 * Delivery is deduped per alert: an alert only re-delivers after
 * `DELIVERY_DEDUPE_MS` have passed since its last delivery, `once` alerts
 * deactivate after firing, and each fire is recorded in `deliveries` so a
 * webhook/email worker can pick it up exactly once.
 */
import { randomUUID } from 'crypto';
import {
  createNotification,
  dedupeNotificationList,
  getNotificationStore,
} from '@/lib/notifications';
import { USER_ROLE_COOKIE } from '@/lib/auth/session';

/**
 * Merchant key for the alert list. The session doesn't expose a merchant id
 * to route handlers yet, so scope by the readable role cookie as a stand-in
 * so two roles don't share a list.
 */
export function merchantKey(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): string {
  const role = req.cookies.get(USER_ROLE_COOKIE)?.value;
  return `merchant:${role ?? 'anon'}`;
}

export type AlertCondition = 'above' | 'below';
export type AlertRecurrence = 'once' | 'recurring';
export type AlertChannel = 'in_app' | 'email' | 'webhook';

export interface AlertWindow {
  /** 24h "HH:MM"; the alert only fires when now is inside [start, end]. */
  start: string;
  end: string;
}

export interface AlertDelivery {
  id: string;
  channel: AlertChannel;
  rate: number;
  at: string;
  /** in_app deliveries are applied immediately; email/webhook are queued. */
  status: 'sent' | 'queued';
}

export interface StoredAlert {
  id: string;
  pair: string;
  condition: AlertCondition;
  target: number;
  enabled: boolean;
  recurrence: AlertRecurrence;
  channels: AlertChannel[];
  window?: AlertWindow;
  triggered?: boolean;
  triggeredAt?: number;
  lastDeliveredAt?: number;
  deliveries: AlertDelivery[];
  createdAt: string;
}

/** Minimum gap between two deliveries of the same alert. */
export const DELIVERY_DEDUPE_MS = 5 * 60 * 1000;

const g = globalThis as unknown as { __bpRateAlerts?: Map<string, StoredAlert[]> };
const store = (g.__bpRateAlerts ??= new Map<string, StoredAlert[]>());

export function listFor(merchant: string): StoredAlert[] {
  let list = store.get(merchant);
  if (!list) {
    list = [];
    store.set(merchant, list);
  }
  return list;
}

export function setFor(merchant: string, list: StoredAlert[]): void {
  store.set(merchant, list);
}

export interface NewAlertInput {
  pair: string;
  condition: AlertCondition;
  target: number;
  recurrence?: AlertRecurrence;
  channels?: AlertChannel[];
  window?: AlertWindow;
}

export function createAlert(input: NewAlertInput): StoredAlert {
  return {
    id: randomUUID(),
    pair: input.pair,
    condition: input.condition,
    target: input.target,
    enabled: true,
    recurrence: input.recurrence ?? 'once',
    channels: input.channels && input.channels.length > 0 ? input.channels : ['in_app'],
    window: input.window,
    triggered: false,
    deliveries: [],
    createdAt: new Date().toISOString(),
  };
}

/** True when `now` falls inside the alert's optional [start, end] window. */
export function withinWindow(alert: StoredAlert, now: Date): boolean {
  if (!alert.window) return true;
  const { start, end } = alert.window;
  const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const s = toMin(start);
  const e = toMin(end);
  // Support windows that wrap past midnight (e.g. 22:00–06:00).
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
}

function conditionMet(alert: StoredAlert, rate: number): boolean {
  return alert.condition === 'above' ? rate >= alert.target : rate <= alert.target;
}

export interface EvaluateResult {
  triggered: StoredAlert[];
  alerts: StoredAlert[];
}

/**
 * Evaluate every alert for `merchant` on `pair` against `rate`, delivering and
 * deduping in place. Returns the alerts that fired this round and the full
 * (mutated) list.
 */
export function evaluateAlerts(
  merchant: string,
  pair: string,
  rate: number,
  now: Date = new Date(),
): EvaluateResult {
  const list = listFor(merchant);
  const triggered: StoredAlert[] = [];

  for (const alert of list) {
    if (!alert.enabled || alert.pair !== pair) continue;
    if (alert.recurrence === 'once' && alert.triggered) continue;
    if (!withinWindow(alert, now)) continue;
    if (!conditionMet(alert, rate)) continue;

    const nowMs = now.getTime();
    if (alert.lastDeliveredAt && nowMs - alert.lastDeliveredAt < DELIVERY_DEDUPE_MS) {
      continue; // already delivered recently — dedupe
    }

    alert.triggered = true;
    alert.triggeredAt = nowMs;
    alert.lastDeliveredAt = nowMs;
    if (alert.recurrence === 'once') alert.enabled = false;

    for (const channel of alert.channels) {
      const delivery: AlertDelivery = {
        id: randomUUID(),
        channel,
        rate,
        at: now.toISOString(),
        status: channel === 'in_app' ? 'sent' : 'queued',
      };
      alert.deliveries.push(delivery);

      if (channel === 'in_app') {
        const notifStore = getNotificationStore();
        const notification = createNotification(
          'rate_alert',
          `${pair} ${alert.condition} ${alert.target}`,
          `${pair} is now ${rate} — your "${alert.condition} ${alert.target}" alert fired.`,
          'rate-alerts',
        );
        notifStore.notifications = dedupeNotificationList(
          notifStore.notifications,
          notification,
        );
      }
      // email / webhook: left in `deliveries` with status 'queued' for the
      // out-of-process worker (feature #38) to pick up and mark 'sent'.
    }

    triggered.push(alert);
  }

  return { triggered, alerts: list };
}
