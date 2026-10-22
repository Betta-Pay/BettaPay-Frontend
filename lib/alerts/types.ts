export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export const ALERT_METRICS = [
  "settlement_failure_rate",
  "fx_deviation",
  "anchor_health",
  "auth_lockout_wave",
] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];

export const ALERT_SEVERITIES: readonly AlertSeverity[] = ["info", "warning", "critical"];

/** A rule breaches when the latest in-window sample is >= `threshold`. */
export interface AlertRule {
  id: AlertMetric;
  metric: AlertMetric;
  name: string;
  description: string;
  unit: string;
  enabled: boolean;
  threshold: number;
  windowMinutes: number;
  severity: AlertSeverity;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: AlertMetric;
  severity: AlertSeverity;
  title: string;
  message: string;
  value: number;
  threshold: number;
  createdAt: string;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: "auto" | string | null;
  /** Store sequence number at the last change; drives `?since=` diff polling. */
  version: number;
}

export interface MetricSample {
  metric: AlertMetric;
  value: number;
  at: string;
}

export interface AlertAuditEntry {
  id: string;
  action: "ALERT_ACKNOWLEDGED" | "ALERT_RESOLVED" | "ALERT_RULE_UPDATED";
  entityType: "ALERT" | "ALERT_RULE";
  entityId: string;
  actor: string;
  createdAt: string;
  detail: string | null;
}

export interface AlertFeedPayload {
  rules: AlertRule[];
  events: AlertEvent[];
  unreadCount: number;
  cursor: string;
}
