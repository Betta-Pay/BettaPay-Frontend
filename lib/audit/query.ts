import type { AuditFilters } from "./types";

/** Filter keys that live in the page URL, in display order. */
export const FILTER_KEYS = ["q", "entityType", "action", "actor", "ip", "from", "to"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
export type UrlFilters = Partial<Record<FilterKey, string>>;

export const ENTITY_TYPES = [
  "MERCHANT",
  "ANCHOR",
  "SETTLEMENT",
  "SETTLEMENT_BATCH",
  "PLATFORM_SETTINGS",
  "IP",
] as const;

/** Actions offered as suggestions; any action (or `PREFIX_*`) can be typed. */
export const KNOWN_ACTIONS = [
  "SETTINGS_UPDATE",
  "KYB_REVIEW",
  "IP_SCORE_CLEARED",
  "ANCHOR_DISABLED",
  "SETTLEMENT_RETRIED",
  "KYB_*",
] as const;

export function readFilters(params: URLSearchParams): UrlFilters {
  const out: UrlFilters = {};
  for (const k of FILTER_KEYS) {
    const v = params.get(k);
    if (v) out[k] = v;
  }
  return out;
}

/** Serialise filters back to a query string (empty values dropped, stable key order). */
export function writeFilters(filters: UrlFilters): string {
  const p = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = filters[k]?.trim();
    if (v) p.set(k, v);
  }
  return p.toString();
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Date inputs hold `YYYY-MM-DD`; the API wants inclusive ISO bounds (UTC). */
export function toApiFilters(f: UrlFilters): AuditFilters {
  return {
    q: f.q,
    entityType: f.entityType,
    action: f.action,
    actor: f.actor,
    ip: f.ip,
    from: f.from && DAY.test(f.from) ? `${f.from}T00:00:00.000Z` : f.from,
    to: f.to && DAY.test(f.to) ? `${f.to}T23:59:59.999Z` : f.to,
  };
}

export function apiQueryString(f: UrlFilters, extra: Record<string, string | number | undefined> = {}): string {
  const p = new URLSearchParams();
  const api = toApiFilters(f);
  for (const [k, v] of Object.entries({ ...api, ...extra })) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}
