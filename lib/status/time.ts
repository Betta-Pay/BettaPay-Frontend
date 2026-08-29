// Relative-time helpers for the public status page.
//
// Incident and component timestamps are real ISO 8601 strings taken straight
// from the live health probe (`checkedAt`, see `lib/status/data.ts`), so
// "checked 2 minutes ago" keeps counting instead of freezing. Everything here
// is pure so it can be unit tested without a DOM.

/** Shown when a timestamp is missing or unparseable. */
export const UNKNOWN_TIME_LABEL = "time unknown";

/** How often the status page recomputes its relative clock. */
export const RELATIVE_TICK_MS = 30_000;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * `Date.now()` floored to the start of the current minute.
 *
 * The status page renders on the server and then hydrates, and both passes
 * evaluate the mock data module independently. Flooring to the minute means the
 * two passes agree on every timestamp and relative label, so hydration stays
 * clean; the live clock takes over from `useNow` once mounted.
 */
export function stableNow(): number {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

/** Parse an ISO string, returning null for missing or invalid input. */
export function parseTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

/**
 * Human "x ago" label computed from a real timestamp.
 * Falls back to `UNKNOWN_TIME_LABEL` when the timestamp is absent or invalid.
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  const ms = parseTimestamp(iso);
  if (ms === null) return UNKNOWN_TIME_LABEL;

  const diff = now - ms;
  const future = diff < 0;
  const abs = Math.abs(diff);

  if (abs < MINUTE) return "just now";

  let phrase: string;
  if (abs < HOUR) {
    phrase = pluralize(Math.floor(abs / MINUTE), "minute");
  } else if (abs < DAY) {
    phrase = pluralize(Math.floor(abs / HOUR), "hour");
  } else if (abs < 30 * DAY) {
    phrase = pluralize(Math.floor(abs / DAY), "day");
  } else {
    phrase = pluralize(Math.floor(abs / (30 * DAY)), "month");
  }

  return future ? `in ${phrase}` : `${phrase} ago`;
}

/**
 * Short calendar label for a component's last incident ("Today", "3 days ago",
 * "Jul 10"). Kept separate from `formatRelativeTime` because the grid wants
 * day-level granularity rather than minutes.
 */
export function formatLastIncident(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  const ms = parseTimestamp(iso);
  if (iso === null || iso === undefined) return "None";
  if (ms === null) return UNKNOWN_TIME_LABEL;

  const days = Math.floor((now - ms) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Absolute timestamp shown next to each incident update. */
export function formatAbsoluteTime(iso: string | null | undefined): string {
  const ms = parseTimestamp(iso);
  if (ms === null) return UNKNOWN_TIME_LABEL;

  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
