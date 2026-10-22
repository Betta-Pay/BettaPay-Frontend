import {
  ALERT_METRICS,
  ALERT_SEVERITIES,
  type AlertMetric,
  type AlertRule,
  type AlertSeverity,
} from "./types";

export function defaultRules(now = new Date().toISOString()): AlertRule[] {
  return [
    {
      id: "settlement_failure_rate",
      metric: "settlement_failure_rate",
      name: "Settlement failure rate",
      description: "Share of settlements that failed in the window.",
      unit: "%",
      enabled: true,
      threshold: 5,
      windowMinutes: 15,
      severity: "critical",
      updatedAt: now,
    },
    {
      id: "fx_deviation",
      metric: "fx_deviation",
      name: "FX rate deviation",
      description: "Deviation of the platform USDC/NGN rate from the reference feed.",
      unit: "%",
      enabled: true,
      threshold: 2,
      windowMinutes: 10,
      severity: "warning",
      updatedAt: now,
    },
    {
      id: "anchor_health",
      metric: "anchor_health",
      name: "Anchor downtime",
      description: "Number of enabled anchors that are degraded or unreachable.",
      unit: "anchors",
      enabled: true,
      threshold: 1,
      windowMinutes: 5,
      severity: "critical",
      updatedAt: now,
    },
    {
      id: "auth_lockout_wave",
      metric: "auth_lockout_wave",
      name: "Auth lockout wave",
      description: "Account lockouts within the window, a sign of credential stuffing.",
      unit: "lockouts",
      enabled: true,
      threshold: 10,
      windowMinutes: 15,
      severity: "warning",
      updatedAt: now,
    },
  ];
}

export function isAlertMetric(value: unknown): value is AlertMetric {
  return typeof value === "string" && (ALERT_METRICS as readonly string[]).includes(value);
}

export interface RulePatch {
  enabled?: boolean;
  threshold?: number;
  windowMinutes?: number;
  severity?: AlertSeverity;
}

export type RulePatchResult =
  | { ok: true; patch: RulePatch }
  | { ok: false; error: string };

/** Validate a client-supplied rule patch. Unknown keys are rejected. */
export function validateRulePatch(body: unknown): RulePatchResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const input = body as Record<string, unknown>;
  const patch: RulePatch = {};
  for (const key of Object.keys(input)) {
    switch (key) {
      case "enabled":
        if (typeof input.enabled !== "boolean") return { ok: false, error: "enabled must be a boolean" };
        patch.enabled = input.enabled;
        break;
      case "threshold":
        if (
          typeof input.threshold !== "number" ||
          !Number.isFinite(input.threshold) ||
          input.threshold <= 0 ||
          input.threshold > 1_000_000
        ) {
          return { ok: false, error: "threshold must be a number greater than 0" };
        }
        patch.threshold = input.threshold;
        break;
      case "windowMinutes":
        if (
          typeof input.windowMinutes !== "number" ||
          !Number.isInteger(input.windowMinutes) ||
          input.windowMinutes < 1 ||
          input.windowMinutes > 1440
        ) {
          return { ok: false, error: "windowMinutes must be a whole number between 1 and 1440" };
        }
        patch.windowMinutes = input.windowMinutes;
        break;
      case "severity":
        if (!ALERT_SEVERITIES.includes(input.severity as AlertSeverity)) {
          return { ok: false, error: "severity must be info, warning or critical" };
        }
        patch.severity = input.severity as AlertSeverity;
        break;
      default:
        return { ok: false, error: `Unknown field "${key}"` };
    }
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "No fields to update" };
  return { ok: true, patch };
}
