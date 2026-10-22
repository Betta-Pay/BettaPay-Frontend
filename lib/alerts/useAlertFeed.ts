"use client";

import { useCallback, useSyncExternalStore } from "react";
import { alertFeed, type AlertFeed, type AlertFeedState } from "./feedStore";

const SERVER_STATE: AlertFeedState = {
  rules: [],
  events: [],
  unreadCount: 0,
  cursor: null,
  loaded: false,
  error: null,
  paused: false,
};

/**
 * Subscribe to the shared alert feed. Polling starts with the first consumer,
 * pauses while the tab is hidden and resumes (with an immediate refetch) when
 * it becomes visible again.
 */
export function useAlertFeed(feed: AlertFeed = alertFeed) {
  // A stable subscribe fn: a new one per render would unsubscribe (stopping
  // the poller) and resubscribe (refetching) on every render.
  const subscribe = useCallback((onChange: () => void) => feed.subscribe(onChange), [feed]);
  const state = useSyncExternalStore(subscribe, feed.getState, () => SERVER_STATE);
  return {
    ...state,
    acknowledge: feed.acknowledge,
    resolve: feed.resolve,
    updateRule: feed.updateRule,
    simulate: feed.simulate,
    refresh: feed.poll,
  };
}

/** Unread alert count for the topbar bell. */
export function useAlertUnreadCount(): number {
  return useAlertFeed().unreadCount;
}
