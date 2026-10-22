import { addSample, evaluateRules } from "../evaluator";
import { acknowledgeEvent, countUnread, createAlertStore, eventsSince } from "../store";

const T0 = new Date("2026-01-01T10:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

function feed(store: ReturnType<typeof createAlertStore>, value: number, min: number) {
  addSample(store, { metric: "settlement_failure_rate", value, at: at(min).toISOString() });
}

describe("alert evaluator", () => {
  it("creates exactly one open alert when a threshold is crossed", () => {
    const store = createAlertStore();
    feed(store, 2, 0);
    expect(evaluateRules(store, at(0))).toHaveLength(0);

    feed(store, 9, 1);
    const changed = evaluateRules(store, at(1));
    expect(changed).toHaveLength(1);
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      ruleId: "settlement_failure_rate",
      status: "open",
      severity: "critical",
      value: 9,
      threshold: 5,
    });
  });

  it("does not duplicate while the rule stays breached, even after ack", () => {
    const store = createAlertStore();
    feed(store, 9, 0);
    evaluateRules(store, at(0));
    acknowledgeEvent(store, store.events[0].id, "admin", at(0));

    feed(store, 11, 2);
    evaluateRules(store, at(2));
    expect(store.events).toHaveLength(1);
    expect(store.events[0].status).toBe("acknowledged");
    expect(store.events[0].value).toBe(11);
  });

  it("auto-resolves when the metric recovers, then re-alerts on a new breach", () => {
    const store = createAlertStore();
    feed(store, 9, 0);
    evaluateRules(store, at(0));
    feed(store, 1, 3);
    evaluateRules(store, at(3));
    expect(store.events[0]).toMatchObject({ status: "resolved", resolvedBy: "auto" });

    feed(store, 8, 5);
    evaluateRules(store, at(5));
    expect(store.events).toHaveLength(2);
    expect(store.events[1].status).toBe("open");
  });

  it("ignores samples outside the window and disabled rules", () => {
    const store = createAlertStore();
    feed(store, 50, 0);
    evaluateRules(store, at(60)); // 15 min window long expired
    expect(store.events).toHaveLength(0);

    feed(store, 50, 60);
    store.rules.find((r) => r.id === "settlement_failure_rate")!.enabled = false;
    evaluateRules(store, at(60));
    expect(store.events).toHaveLength(0);
  });

  it("acking drops the unread count and writes an audit entry", () => {
    const store = createAlertStore();
    feed(store, 9, 0);
    evaluateRules(store, at(0));
    expect(countUnread(store.events)).toBe(1);

    const event = acknowledgeEvent(store, store.events[0].id, "admin", at(1))!;
    expect(event).toMatchObject({ status: "acknowledged", acknowledgedBy: "admin", acknowledgedAt: at(1).toISOString() });
    expect(countUnread(store.events)).toBe(0);
    expect(store.audit).toEqual([
      expect.objectContaining({ action: "ALERT_ACKNOWLEDGED", entityId: event.id, actor: "admin", createdAt: at(1).toISOString() }),
    ]);
  });

  it("?since cursor returns only events changed after it", () => {
    const store = createAlertStore();
    feed(store, 9, 0);
    evaluateRules(store, at(0));
    const cursor = store.seq;
    expect(eventsSince(store, cursor)).toHaveLength(0);

    addSample(store, { metric: "fx_deviation", value: 4, at: at(1).toISOString() });
    evaluateRules(store, at(1));
    const diff = eventsSince(store, cursor);
    expect(diff).toHaveLength(1);
    expect(diff[0].ruleId).toBe("fx_deviation");

    acknowledgeEvent(store, store.events[0].id, "admin", at(2));
    expect(eventsSince(store, cursor).map((e) => e.ruleId).sort()).toEqual(["fx_deviation", "settlement_failure_rate"]);
  });
});
