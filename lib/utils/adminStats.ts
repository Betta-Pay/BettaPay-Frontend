/**
 * Display helpers for the admin overview KPIs.
 *
 * `/api/admin/stats` can return zeroes, `null`s or missing fields in a fresh
 * or empty environment (no prior-period volume, no merchants yet). Used
 * directly, those values render as `NaN%`, `Infinity`, `+undefined%`, or throw
 * (`undefined.toFixed()` / `null.toLocaleString()`). These helpers turn every
 * such input into a safe, honest label: a real number, `0%`, or an em dash.
 */

const EM_DASH = '—';

/** True only for real, finite numbers (rejects NaN, ±Infinity, null, strings). */
export function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Returns the value when it is a usable number, otherwise `null`. */
export function usableNumber(value: unknown): number | null {
  return isUsableNumber(value) ? value : null;
}

/**
 * Ratio of `part` to `whole` as a percentage (1.5 means 1.5%), or `null` when
 * `whole` is zero or either input is unusable.
 */
export function percentOf(
  part: number | null | undefined,
  whole: number | null | undefined,
): number | null {
  if (!isUsableNumber(part) || !isUsableNumber(whole) || whole === 0) return null;
  const ratio = (part / whole) * 100;
  return Number.isFinite(ratio) ? ratio : null;
}

/**
 * Signed percentage label: `+12.5%`, `-3.0%`, `0%`, or `—` when the value is
 * missing. A change that rounds to zero is shown as `0%`, never `+0.0%` or
 * `-0.0%`.
 */
export function formatSignedPercent(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (!isUsableNumber(value)) return EM_DASH;
  const rounded = Number(value.toFixed(fractionDigits));
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(fractionDigits)}%`;
}

/** Unsigned percentage label such as `1.0%`, or `—` when the value is missing. */
export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  return isUsableNumber(value) ? `${value.toFixed(fractionDigits)}%` : EM_DASH;
}

/** Locale-formatted whole-number count, or `—` when the value is missing. */
export function formatCount(value: number | null | undefined): string {
  return isUsableNumber(value) ? value.toLocaleString() : EM_DASH;
}

export type TrendDirection = 'up' | 'down' | 'flat';

/** Direction of a percentage change; anything missing or zero is `flat`. */
export function trendDirection(value: number | null | undefined): TrendDirection {
  if (!isUsableNumber(value)) return 'flat';
  const rounded = Number(value.toFixed(1));
  if (rounded > 0) return 'up';
  if (rounded < 0) return 'down';
  return 'flat';
}
