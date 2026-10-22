import { createAlertFeed } from "../feedStore";
import type { AlertEvent, AlertFeedPayload } from "../types";

const event = (over: Partial<AlertEvent> = {}): AlertEvent => ({
  id: "a1",
  ruleId: "fx_deviation",
  severity: "warning",
  title: "FX",
  message: "m",
  value: 3,
  threshold: 2,
  createdAt: "2026-01-01T10:00:00Z",
  status: "open",
  acknowledgedBy: null,
  acknowledgedAt: null,
  resolvedAt: null,
  resolvedBy: null,
  version: 1,
  ...over,
});

const payload = (events: AlertEvent[], cursor: string): AlertFeedPayload => ({
  rules: [],
  events,
  unreadCount: events.filter((e) => e.status === "open").length,
  cursor,
});

const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body } as Response);

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("alert feed polling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setVisibility("visible");
  });
  afterEach(() => jest.useRealTimers());

  it("polls with the cursor, pauses while hidden and catches up on visible", async () => {
    const fetchImpl = jest.fn().mockImplementation(() => ok(payload([event()], "5")));
    const feed = createAlertFeed({ intervalMs: 1000, fetchImpl });
    const unsub = feed.subscribe(() => undefined);

    await jest.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/admin/alerts");
    expect(feed.getState().unreadCount).toBe(1);

    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toBe("/api/admin/alerts?since=5");

    setVisibility("hidden");
    expect(feed.getState().paused).toBe(true);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    setVisibility("visible");
    await jest.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(feed.getState().paused).toBe(false);
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);

    unsub();
    await jest.advanceTimersByTimeAsync(5000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("acknowledge is optimistic and rolls back when the request fails", async () => {
    let fail = false;
    const fetchImpl = jest.fn().mockImplementation((url: string) => {
      if (url.endsWith("/ack")) {
        return fail
          ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "boom" }) } as Response)
          : ok({ data: event({ status: "acknowledged", acknowledgedBy: "admin" }) });
      }
      return ok(payload([event()], "1"));
    });
    const feed = createAlertFeed({ intervalMs: 1000, fetchImpl });
    const unsub = feed.subscribe(() => undefined);
    await jest.advanceTimersByTimeAsync(0);
    expect(feed.getState().unreadCount).toBe(1);

    const pending = feed.acknowledge("a1");
    expect(feed.getState().unreadCount).toBe(0); // hidden immediately
    await pending;
    expect(feed.getState().events[0].status).toBe("acknowledged");

    fail = true;
    const feed2 = createAlertFeed({ intervalMs: 1000, fetchImpl });
    const unsub2 = feed2.subscribe(() => undefined);
    await jest.advanceTimersByTimeAsync(0);
    const p2 = feed2.acknowledge("a1");
    expect(feed2.getState().unreadCount).toBe(0);
    await expect(p2).rejects.toThrow("boom");
    expect(feed2.getState().unreadCount).toBe(1);
    expect(feed2.getState().events[0].status).toBe("open");
    unsub();
    unsub2();
  });
});
