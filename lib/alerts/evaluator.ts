import { mockAnchorStats, anchorStore } from "@/lib/mock/anchors";
import { countUnread, nextSeq, type AlertStore } from "./store";
import type { AlertEvent, AlertMetric, AlertRule, MetricSample } from "./types";

const MAX_SAMPLES_PER_METRIC = 200;

export function addSample(store: AlertStore, sample: MetricSample): void {
  const list = store.samples[sample.metric];
  list.push(sample);
  if (list.length > MAX_SAMPLES_PER_METRIC) list.splice(0, list.length - MAX_SAMPLES_PER_METRIC);
}

/** The newest sample still inside the rule's window, or null when none is. */
export function latestInWindow(
  store: AlertStore,
  rule: AlertRule,
  now: Date,
): MetricSample | null {
  const cutoff = now.getTime() - rule.windowMinutes * 60_000;
  let latest: MetricSample | null = null;
  for (const s of store.samples[rule.metric]) {
    const t = Date.parse(s.at);
    if (t < cutoff || t > now.getTime() + 60_000) continue;
    if (!latest || t >= Date.parse(latest.at)) latest = s;
  }
  return latest;
}

function formatValue(rule: AlertRule, value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rule.unit === "%" ? `${rounded}%` : `${rounded} ${rule.unit}`;
}

function activeEventFor(store: AlertStore, rule: AlertRule): AlertEvent | undefined {
  return store.events.find((e) => e.ruleId === rule.id && e.status !== "resolved");
}

/**
 * Evaluate every enabled rule against its latest in-window sample.
 *
 * - breach with no active alert  -> create one `open` event
 * - breach with an active alert  -> refresh its value only (no duplicate row,
 *   and an acknowledged alert stays acknowledged)
 * - recovery with an active alert -> auto-resolve it
 * Returns the events that were created or changed.
 */
export function evaluateRules(store: AlertStore, now = new Date()): AlertEvent[] {
  const changed: AlertEvent[] = [];
  for (const rule of store.rules) {
    if (!rule.enabled) continue;
    const sample = latestInWindow(store, rule, now);
    if (!sample) continue;

    const breached = sample.value >= rule.threshold;
    const active = activeEventFor(store, rule);

    if (breached && !active) {
      const event: AlertEvent = {
        id: `alt_${nextSeq(store)}_${now.getTime().toString(36)}`,
        ruleId: rule.id,
        severity: rule.severity,
        title: `${rule.name} above threshold`,
        message: `${rule.name} is ${formatValue(rule, sample.value)} (threshold ${formatValue(rule, rule.threshold)}, ${rule.windowMinutes} min window).`,
        value: sample.value,
        threshold: rule.threshold,
        createdAt: now.toISOString(),
        status: "open",
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedAt: null,
        resolvedBy: null,
        version: store.seq,
      };
      event.version = nextSeq(store);
      store.events.push(event);
      changed.push(event);
    } else if (breached && active) {
      if (active.value !== sample.value) {
        active.value = sample.value;
        active.message = `${rule.name} is ${formatValue(rule, sample.value)} (threshold ${formatValue(rule, rule.threshold)}, ${rule.windowMinutes} min window).`;
        active.version = nextSeq(store);
        changed.push(active);
      }
    } else if (!breached && active) {
      active.status = "resolved";
      active.resolvedAt = now.toISOString();
      active.resolvedBy = "auto";
      active.version = nextSeq(store);
      changed.push(active);
    }
  }
  return changed;
}

/**
 * Feed one metric from data this server can actually read: the worst
 * per-anchor settlement failure rate over enabled anchors. Only used when
 * nothing has been ingested for the metric, so manual samples win.
 */
export function sampleLiveMetrics(store: AlertStore, now = new Date()): void {
  if (store.samples.settlement_failure_rate.length > 0) return;
  const rates = anchorStore
    .filter((a) => a.enabled)
    .map((a) => mockAnchorStats[a.id]?.failureRate)
    .filter((r): r is number => typeof r === "number");
  if (rates.length === 0) return;
  addSample(store, {
    metric: "settlement_failure_rate" satisfies AlertMetric,
    value: Math.max(...rates),
    at: now.toISOString(),
  });
}

export function evaluateAll(store: AlertStore, now = new Date()): AlertEvent[] {
  sampleLiveMetrics(store, now);
  return evaluateRules(store, now);
}

export { countUnread };
