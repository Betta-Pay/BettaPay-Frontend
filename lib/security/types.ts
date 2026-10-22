/** Mirrors AUTH_IP_SCORE_THRESHOLD / TTL in the backend auth-hardening module. */
export const IP_SCORE_THRESHOLD = 20;
export const IP_SCORE_WINDOW_SECONDS = 15 * 60;

export type AuthOutcome = "success" | "failure";

export interface AuthAttempt {
  id: string;
  ip: string;
  /** ISO timestamp. */
  at: string;
  outcome: AuthOutcome;
  endpoint: string;
  statusCode: number;
  userAgent?: string;
}

export interface IpSummary {
  ip: string;
  /** Score from this app's cached attempt log, not the live backend value. */
  cachedScore: number;
  threshold: number;
  lockedOut: boolean;
  retryAfterSeconds: number;
  lastEventAt: string | null;
  failures: number;
  successes: number;
  clearedAt: string | null;
  clearedBy: string | null;
}

export interface LiveScore {
  ip: string;
  score: number;
  fetchedAt: string;
}

export type LiveLookup =
  | { ok: true; live: LiveScore }
  | { ok: false; error: string };

export interface IpListResponse {
  data: IpSummary[];
  threshold: number;
}

export interface IpDetailResponse {
  summary: IpSummary;
  attempts: AuthAttempt[];
  live: LiveScore | null;
  /** Set when the backend could not be reached; `live` is null then. */
  liveError: string | null;
}

export interface ClearResponse {
  summary: IpSummary;
  /** True only when the backend itself confirmed the clear. */
  backendCleared: boolean;
  backendNote: string | null;
  auditId: string;
}
