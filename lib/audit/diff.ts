/**
 * Structured JSON diff used by the audit explorer. Walks `before` and `after`
 * and reports every leaf path as added, removed or modified, so a settings
 * change reads as "feeBps: 100 -> 150" rather than two raw JSON blobs.
 */
export type DiffKind = "added" | "removed" | "modified";

export interface DiffRow {
  /** Dotted path, e.g. `fees.defaultBps` or `rules[0].limit`. */
  path: string;
  kind: DiffKind;
  before?: unknown;
  after?: unknown;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function join(path: string, key: string | number): string {
  if (typeof key === "number") return `${path}[${key}]`;
  return path ? `${path}.${key}` : key;
}

function walk(before: unknown, after: unknown, path: string, out: DiffRow[]) {
  if (equal(before, after)) return;

  if (isObject(before) && isObject(after)) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
    for (const key of keys) {
      const p = join(path, key);
      if (!(key in before)) out.push({ path: p, kind: "added", after: after[key] });
      else if (!(key in after)) out.push({ path: p, kind: "removed", before: before[key] });
      else walk(before[key], after[key], p, out);
    }
    return;
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const len = Math.max(before.length, after.length);
    for (let i = 0; i < len; i++) {
      const p = join(path, i);
      if (i >= before.length) out.push({ path: p, kind: "added", after: after[i] });
      else if (i >= after.length) out.push({ path: p, kind: "removed", before: before[i] });
      else walk(before[i], after[i], p, out);
    }
    return;
  }

  const p = path || "(value)";
  if (before === undefined || before === null) {
    out.push({ path: p, kind: "added", after });
  } else if (after === undefined || after === null) {
    out.push({ path: p, kind: "removed", before });
  } else {
    out.push({ path: p, kind: "modified", before, after });
  }
}

export function diffJson(before: unknown, after: unknown): DiffRow[] {
  const out: DiffRow[] = [];
  // A missing side against an object is "every field added/removed", not one
  // opaque value, so expand it to an empty object.
  const b = before == null && isObject(after) ? {} : before ?? null;
  const a = after == null && isObject(before) ? {} : after ?? null;
  walk(b, a, "", out);
  return out;
}

/** Compact display of a leaf value. */
export function formatDiffValue(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}
