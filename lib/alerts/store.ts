import { defaultRules } from "./rules";
import type {
  AlertAuditEntry,
  AlertEvent,
  AlertMetric,
  AlertRule,
  MetricSample,
} from "./types";

/**
 * In-memory alert state for the frontend-only environment. Held on
 * `globalThis` so dev hot reloads and separate route modules share it.
 */
export interface AlertStore {
  rules: AlertRule[];
  events: AlertEvent[];
  samples: Record<AlertMetric, MetricSample[]>;
  audit: AlertAuditEntry[];
  /** Monotonic change counter; events carry the value at their last change. */
  seq: number;
}

const KEY = "__bettapayAlertStore__";

function emptySamples(): AlertStore["samples"] {
  return {
    settlement_failure_rate: [],
    fx_deviation: [],
    anchor_health: [],
    auth_lockout_wave: [],
  };
}

export function createAlertStore(): AlertStore {
  return { rules: defaultRules(), events: [], samples: emptySamples(), audit: [], seq: 0 };
}

export function getAlertStore(): AlertStore {
  const g = globalThis as unknown as Record<string, AlertStore | undefined>;
  if (!g[KEY]) g[KEY] = createAlertStore();
  return g[KEY] as AlertStore;
}

export function resetAlertStore(): void {
  (globalThis as unknown as Record<string, AlertStore | undefined>)[KEY] = createAlertStore();
}

export function nextSeq(store: AlertStore): number {
  store.seq += 1;
  return store.seq;
}

export function recordAudit(
  store: AlertStore,
  entry: Omit<AlertAuditEntry, "id" | "createdAt">,
  now = new Date(),
): AlertAuditEntry {
  const full: AlertAuditEntry = {
    ...entry,
    id: `alt_aud_${nextSeq(store)}_${now.getTime()}`,
    createdAt: now.toISOString(),
  };
  store.audit.push(full);
  return full;
}

export function countUnread(events: readonly AlertEvent[]): number {
  return events.filter((e) => e.status === "open").length;
}

/** Events changed after `since` (a cursor from a previous response). */
export function eventsSince(store: AlertStore, since: number | null): AlertEvent[] {
  const list = since === null ? store.events : store.events.filter((e) => e.version > since);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function acknowledgeEvent(
  store: AlertStore,
  id: string,
  actor: string,
  now = new Date(),
): AlertEvent | null {
  const event = store.events.find((e) => e.id === id);
  if (!event) return null;
  if (event.status === "open") {
    event.status = "acknowledged";
    event.acknowledgedBy = actor;
    event.acknowledgedAt = now.toISOString();
    event.version = nextSeq(store);
    recordAudit(
      store,
      { action: "ALERT_ACKNOWLEDGED", entityType: "ALERT", entityId: id, actor, detail: event.title },
      now,
    );
  }
  return event;
}

export function resolveEvent(
  store: AlertStore,
  id: string,
  actor: string,
  now = new Date(),
): AlertEvent | null {
  const event = store.events.find((e) => e.id === id);
  if (!event) return null;
  if (event.status !== "resolved") {
    event.status = "resolved";
    event.resolvedAt = now.toISOString();
    event.resolvedBy = actor;
    event.version = nextSeq(store);
    recordAudit(
      store,
      { action: "ALERT_RESOLVED", entityType: "ALERT", entityId: id, actor, detail: event.title },
      now,
    );
  }
  return event;
}
