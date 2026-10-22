import { isValidIp } from "./validateIp";
import type { LiveLookup } from "./types";

const TIMEOUT_MS = 5000;

function base(): string {
  return (
    process.env.ADMIN_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001"
  ).replace(/\/+$/, "");
}

function headers(): Record<string, string> {
  const key = process.env.ADMIN_API_KEY;
  return key ? { "x-admin-api-key": key } : {};
}

async function call(path: string, method: "GET" | "DELETE"): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${base()}${path}`, {
      method,
      headers: headers(),
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live score from `GET /api/admin/auth/ip-score`. Never fabricates a value:
 * any failure comes back as `{ ok: false, error }`.
 */
export async function fetchLiveIpScore(ip: string): Promise<LiveLookup> {
  if (!isValidIp(ip)) return { ok: false, error: "Invalid IP address" };
  try {
    const res = await call(`/api/admin/auth/ip-score?ip=${encodeURIComponent(ip)}`, "GET");
    if (!res.ok) return { ok: false, error: `Backend returned ${res.status}` };
    const body = (await res.json()) as { ip?: unknown; score?: unknown };
    if (typeof body.score !== "number" || !Number.isFinite(body.score)) {
      return { ok: false, error: "Backend returned an unexpected response" };
    }
    return { ok: true, live: { ip, score: body.score, fetchedAt: new Date().toISOString() } };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, error: aborted ? "Backend unreachable (timed out)" : "Backend unreachable" };
  }
}

/**
 * Ask the backend to clear a score. The backend has no such endpoint today, so
 * 404/405 is expected and reported as "not confirmed" rather than an error.
 */
export async function clearLiveIpScore(
  ip: string,
): Promise<{ cleared: boolean; note: string | null }> {
  if (!isValidIp(ip)) return { cleared: false, note: "Invalid IP address" };
  try {
    const res = await call(`/api/admin/auth/ip-score?ip=${encodeURIComponent(ip)}`, "DELETE");
    if (res.ok) return { cleared: true, note: null };
    if (res.status === 404 || res.status === 405) {
      return { cleared: false, note: "Backend does not support clearing scores yet" };
    }
    return { cleared: false, note: `Backend returned ${res.status}` };
  } catch {
    return { cleared: false, note: "Backend unreachable" };
  }
}
