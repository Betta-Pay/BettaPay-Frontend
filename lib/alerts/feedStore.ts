import { countUnread } from "./store";
import type { AlertEvent, AlertFeedPayload, AlertMetric, AlertRule } from "./types";

export interface AlertFeedState {
  rules: AlertRule[];
  events: AlertEvent[];
  unreadCount: number;
  cursor: string | null;
  loaded: boolean;
  error: string | null;
  /** True while polling is suspended because the tab is hidden. */
  paused: boolean;
}

export interface AlertFeedOptions {
  intervalMs?: number;
  fetchImpl?: typeof fetch;
}

const ENDPOINT = "/api/admin/alerts";

function sortEvents(events: AlertEvent[]): AlertEvent[] {
  return [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Polling-with-diff client for the alert feed.
 *
 * Polls `?since=<cursor>` so only changed events cross the wire, merges them
 * by id, and suspends entirely while `document.visibilityState === "hidden"`;
 * becoming visible triggers an immediate catch-up poll. One instance is shared
 * (see `alertFeed`) so the alerts page and the topbar bell never double-poll.
 */
export function createAlertFeed({ intervalMs = 10_000, fetchImpl }: AlertFeedOptions = {}) {
  let state: AlertFeedState = {
    rules: [],
    events: [],
    unreadCount: 0,
    cursor: null,
    loaded: false,
    error: null,
    paused: false,
  };
  const listeners = new Set<() => void>();
  const pendingAcks = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let subscribers = 0;
  let inFlight: Promise<void> | null = null;

  const doFetch = (input: string, init?: RequestInit) =>
    (fetchImpl ?? fetch)(input, { cache: "no-store", credentials: "same-origin", ...init });

  const isHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";

  function set(next: Partial<AlertFeedState>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  }

  function merge(payload: AlertFeedPayload) {
    const byId = new Map(state.events.map((e) => [e.id, e]));
    for (const incoming of payload.events) {
      // A newer local optimistic ack must not be clobbered by a poll that
      // raced the acknowledge request.
      if (pendingAcks.has(incoming.id) && incoming.status === "open") continue;
      byId.set(incoming.id, incoming);
    }
    const events = sortEvents([...byId.values()]);
    set({
      rules: payload.rules,
      events,
      unreadCount: countUnread(events),
      cursor: payload.cursor,
      loaded: true,
      error: null,
    });
  }

  async function poll(): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const url = state.cursor ? `${ENDPOINT}?since=${encodeURIComponent(state.cursor)}` : ENDPOINT;
        const res = await doFetch(url);
        if (!res.ok) throw new Error(`Alerts request failed (${res.status})`);
        merge((await res.json()) as AlertFeedPayload);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : "Unable to load alerts", loaded: true });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (subscribers === 0 || isHidden()) return;
    timer = setTimeout(async () => {
      await poll();
      schedule();
    }, intervalMs);
  }

  function onVisibility() {
    if (subscribers === 0) return;
    if (isHidden()) {
      if (timer) clearTimeout(timer);
      timer = null;
      set({ paused: true });
    } else {
      set({ paused: false });
      void poll().then(schedule);
    }
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    subscribers += 1;
    if (subscribers === 1) {
      document.addEventListener("visibilitychange", onVisibility);
      set({ paused: isHidden() });
      if (!isHidden()) void poll().then(schedule);
    }
    return () => {
      listeners.delete(listener);
      subscribers -= 1;
      if (subscribers === 0) {
        document.removeEventListener("visibilitychange", onVisibility);
        if (timer) clearTimeout(timer);
        timer = null;
      }
    };
  }

  async function send(path: string, init: RequestInit): Promise<Response> {
    const res = await doFetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Request failed (${res.status})`);
    }
    return res;
  }

  /** Optimistic: hides the alert from the unread count now, rolls back on failure. */
  async function acknowledge(id: string): Promise<void> {
    const snapshot = state;
    const target = state.events.find((e) => e.id === id);
    if (!target || target.status !== "open") return;
    pendingAcks.add(id);
    const events = state.events.map((e) =>
      e.id === id
        ? { ...e, status: "acknowledged" as const, acknowledgedBy: "admin", acknowledgedAt: new Date().toISOString() }
        : e,
    );
    set({ events, unreadCount: countUnread(events) });
    try {
      const res = await send(`${ENDPOINT}/${encodeURIComponent(id)}/ack`, { method: "POST" });
      const { data } = (await res.json()) as { data: AlertEvent };
      pendingAcks.delete(id);
      const merged = state.events.map((e) => (e.id === id ? data : e));
      set({ events: merged, unreadCount: countUnread(merged), error: null });
    } catch (err) {
      pendingAcks.delete(id);
      set({
        events: snapshot.events,
        unreadCount: snapshot.unreadCount,
        error: err instanceof Error ? err.message : "Unable to acknowledge alert",
      });
      throw err;
    }
  }

  async function resolve(id: string): Promise<void> {
    const res = await send(`${ENDPOINT}/${encodeURIComponent(id)}/resolve`, { method: "POST" });
    const { data } = (await res.json()) as { data: AlertEvent };
    const events = state.events.map((e) => (e.id === id ? data : e));
    set({ events, unreadCount: countUnread(events) });
  }

  async function updateRule(
    ruleId: AlertMetric,
    patch: Partial<Pick<AlertRule, "enabled" | "threshold" | "windowMinutes" | "severity">>,
  ): Promise<AlertRule> {
    const res = await send(`${ENDPOINT}/rules/${encodeURIComponent(ruleId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    const { data } = (await res.json()) as { data: AlertRule };
    set({ rules: state.rules.map((r) => (r.id === ruleId ? data : r)) });
    void poll();
    return data;
  }

  async function simulate(metric: AlertMetric, value: number): Promise<void> {
    const res = await send(`${ENDPOINT}/metrics`, {
      method: "POST",
      body: JSON.stringify({ metric, value }),
    });
    merge((await res.json()) as AlertFeedPayload);
  }

  return {
    getState: () => state,
    subscribe,
    poll,
    acknowledge,
    resolve,
    updateRule,
    simulate,
  };
}

export type AlertFeed = ReturnType<typeof createAlertFeed>;

/** Shared singleton used by the alerts page, settings editor and topbar bell. */
export const alertFeed: AlertFeed = createAlertFeed();
