import { evaluateAll } from "./evaluator";
import { countUnread, eventsSince, getAlertStore } from "./store";
import type { AlertFeedPayload } from "./types";

/** Evaluate, then build the feed payload. `since` returns only changed events. */
export function buildFeed(sinceParam: string | null, now = new Date()): AlertFeedPayload {
  const store = getAlertStore();
  evaluateAll(store, now);
  const parsed = sinceParam === null || sinceParam === "" ? null : Number(sinceParam);
  const since = parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
  return {
    rules: store.rules,
    events: eventsSince(store, since),
    unreadCount: countUnread(store.events),
    cursor: String(store.seq),
  };
}
