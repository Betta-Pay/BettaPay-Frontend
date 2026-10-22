import {
  IP_SCORE_THRESHOLD,
  IP_SCORE_WINDOW_SECONDS,
  type AuthAttempt,
  type AuthOutcome,
  type IpSummary,
} from "./types";

/**
 * Forensic cache of auth attempts this app has observed, per IP. It is a
 * mirror of the backend's counter rule (+1 failure, -1 success, 15 minute
 * window, floor 0), not the source of truth: the live score always comes from
 * the backend.
 */
interface State {
  attempts: AuthAttempt[];
  /** Attempts at or before this time no longer count (a clear). */
  clears: Record<string, { at: string; by: string }>;
  seq: number;
}

const g = globalThis as unknown as { __bpIpForensics?: State };

const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString();

function seed(): State {
  const attempts: AuthAttempt[] = [];
  let n = 0;
  const add = (ip: string, secondsAgo: number, outcome: AuthOutcome, endpoint: string, statusCode: number, userAgent?: string) =>
    attempts.push({ id: `att_seed_${++n}`, ip, at: ago(secondsAgo), outcome, endpoint, statusCode, userAgent });

  // High-score IP: credential stuffing against login and wallet verify.
  for (let i = 0; i < 24; i++) {
    add("203.0.113.45", 600 - i * 20, "failure", i % 3 === 0 ? "/api/auth/wallet/verify" : "/api/auth/login", 401, "python-requests/2.31");
  }
  // Moderate IP, below threshold.
  for (let i = 0; i < 6; i++) add("198.51.100.7", 300 - i * 30, "failure", "/api/auth/login", 401, "Mozilla/5.0");
  add("198.51.100.7", 40, "success", "/api/auth/login", 200, "Mozilla/5.0");
  // Healthy IP.
  add("102.89.34.17", 1200, "success", "/api/auth/login", 200, "Mozilla/5.0");
  add("102.89.34.17", 300, "success", "/api/auth/magic", 200, "Mozilla/5.0");
  add("2001:db8::1a", 200, "failure", "/api/auth/magic", 400, "curl/8.4");
  add("2001:db8::1a", 100, "failure", "/api/auth/magic", 400, "curl/8.4");

  return { attempts, clears: {}, seq: n };
}

function state(): State {
  return (g.__bpIpForensics ??= seed());
}

export function resetIpStore(): void {
  g.__bpIpForensics = seed();
}

export function recordAttempt(input: Omit<AuthAttempt, "id" | "at"> & { at?: string }): AuthAttempt {
  const s = state();
  const attempt: AuthAttempt = { ...input, id: `att_${++s.seq}`, at: input.at ?? new Date().toISOString() };
  s.attempts.push(attempt);
  return attempt;
}

/** Attempts still inside the 15 minute window and after the last clear. */
function liveWindow(ip: string, now: number): AuthAttempt[] {
  const s = state();
  const cutoff = Math.max(
    now - IP_SCORE_WINDOW_SECONDS * 1000,
    s.clears[ip] ? Date.parse(s.clears[ip].at) : 0,
  );
  return s.attempts
    .filter((a) => a.ip === ip && Date.parse(a.at) > cutoff)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Replays the backend counter: +1 failure, -1 success, never below 0. */
export function summarize(ip: string, now = Date.now()): IpSummary {
  const s = state();
  const windowed = liveWindow(ip, now);
  let score = 0;
  let lastFailureAt: number | null = null;
  for (const a of windowed) {
    if (a.outcome === "failure") {
      score += 1;
      lastFailureAt = Date.parse(a.at);
    } else {
      score = Math.max(0, score - 1);
    }
  }
  const lockedOut = score >= IP_SCORE_THRESHOLD;
  // The backend refreshes the TTL on every failure, so the lock lifts one
  // window after the last failure.
  const retryAfterSeconds =
    lockedOut && lastFailureAt !== null
      ? Math.max(0, Math.ceil((lastFailureAt + IP_SCORE_WINDOW_SECONDS * 1000 - now) / 1000))
      : 0;

  const all = s.attempts.filter((a) => a.ip === ip);
  const last = all.reduce<string | null>((m, a) => (m === null || a.at > m ? a.at : m), null);
  return {
    ip,
    cachedScore: score,
    threshold: IP_SCORE_THRESHOLD,
    lockedOut,
    retryAfterSeconds,
    lastEventAt: last,
    failures: all.filter((a) => a.outcome === "failure").length,
    successes: all.filter((a) => a.outcome === "success").length,
    clearedAt: s.clears[ip]?.at ?? null,
    clearedBy: s.clears[ip]?.by ?? null,
  };
}

export function listIps(q = "", limit = 100, now = Date.now()): IpSummary[] {
  const needle = q.trim().toLowerCase();
  const ips = Array.from(new Set(state().attempts.map((a) => a.ip)));
  return ips
    .filter((ip) => !needle || ip.toLowerCase().includes(needle))
    .map((ip) => summarize(ip, now))
    .sort((a, b) => b.cachedScore - a.cachedScore || (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""))
    .slice(0, Math.min(Math.max(limit, 1), 500));
}

export function attemptsFor(ip: string, limit = 200): AuthAttempt[] {
  return state()
    .attempts.filter((a) => a.ip === ip)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1))
    .slice(0, limit);
}

export function clearLocal(ip: string, by: string, now = Date.now()): void {
  state().clears[ip] = { at: new Date(now).toISOString(), by };
}
