/**
 * Compact relative-time label used in dense admin tables ("5m ago", "3h ago",
 * "2d ago").
 *
 * Anything that cannot be turned into a real moment in time — `null`,
 * `undefined`, an empty string, or a string `Date.parse` rejects — renders as
 * `"Unknown"`. Without that guard `Date.parse` yields `NaN`, and the maths
 * below turns that into the literal text `"NaNd ago"`.
 *
 * A timestamp in the future (clock skew between the browser and the API) is
 * treated as "just now" rather than rendering a negative duration.
 *
 * @param iso - ISO-8601 timestamp, or a missing value.
 * @param now - Reference time in epoch milliseconds. Defaults to `Date.now()`;
 *              injectable so tests do not depend on the wall clock.
 */
export function fmtRelative(
  iso: string | null | undefined,
  now: number = Date.now(),
): string {
  if (typeof iso !== 'string' || iso.trim() === '') return 'Unknown';

  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'Unknown';

  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
}
