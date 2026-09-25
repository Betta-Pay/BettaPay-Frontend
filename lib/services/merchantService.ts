/**
 * Merchant API service layer.
 *
 * Route handlers under `app/api/merchants/**` only do HTTP work: read the
 * request, validate path/query shape, and format the response. Upstream calls,
 * aggregation, filtering, pagination and team mutations live here so they can
 * be unit tested without standing up Next.js.
 */

import { z } from "zod";
import { inviteMember, listTeam } from "@/lib/team/store";
import { MERCHANT_ROLES, type TeamMember } from "@/lib/team/types";

// ─── Activity feed ──────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type:
    | "payment_received"
    | "settlement_initiated"
    | "settlement_completed"
    | "webhook_delivered"
    | "api_key_used";
  title: string;
  description: string;
  timestamp: string;
  detailHref: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityPage {
  data: ActivityEvent[];
  nextCursor: string | null;
}

export interface ListActivityQuery {
  /** Validated by the route; forwarded for logging/upstream scoping. */
  merchantId: string;
  /** Raw `limit` query value — parsed with {@link parseActivityLimit}. */
  limit?: string | number | null;
  /** Id of the last event from the previous page. */
  cursor?: string | null;
  /** Raw `filter` query value: `all` | `payments` | `settlements` | `webhooks`. */
  filter?: string | null;
  /** Cookie header forwarded to the backend so it can resolve the session. */
  cookie?: string;
  /** Overrides the upstream base URL (tests). Defaults to `NEXT_PUBLIC_API_URL`. */
  upstreamBase?: string;
  /** Clock for the mock feed (tests). */
  now?: Date;
}

export const DEFAULT_ACTIVITY_LIMIT = 20;

interface RawPayment {
  id: string;
  amountUsdc?: number;
  payerAddress?: string | null;
  source?: string | null;
  createdAt: string;
}

interface RawSettlement {
  id: string;
  status: string;
  amountUsdc?: number;
  bankName?: string | null;
  createdAt: string;
}

interface RawWebhook {
  id: string;
  eventType?: string;
  targetUrl?: string;
  timestamp?: string;
  createdAt?: string;
}

interface RawSession {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

/** Base URL of the backend API, or the local default when unset. */
export function resolveUpstreamBase(explicit?: string): string {
  return explicit || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

/**
 * A localhost upstream would call this route back, so treat it as a self-loop
 * and serve the mock feed instead of fetching.
 */
export function isSelfLoop(base: string): boolean {
  return !base || base.includes("localhost") || base.includes("127.0.0.1");
}

/** Non-numeric or non-positive limits fall back to the default page size. */
export function parseActivityLimit(raw: string | number | null | undefined): number {
  const parsed = typeof raw === "number" ? raw : parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACTIVITY_LIMIT;
}

/** Deterministic demo feed used whenever the backend is not reachable. */
export function buildMockActivityEvents(now: Date = new Date()): ActivityEvent[] {
  const subHours = (hrs: number) => new Date(now.getTime() - hrs * 60 * 60 * 1000).toISOString();
  const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    // Today
    {
      id: "act-01",
      type: "payment_received",
      title: "Payment Received",
      description: "$1,500.00 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subHours(2),
      detailHref: "/transactions",
    },
    {
      id: "act-02",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(2.1),
      detailHref: "/developers",
    },
    {
      id: "act-03",
      type: "api_key_used",
      title: "API Key Used",
      description: "Live Secret Key verified for payment link creation",
      timestamp: subHours(4),
      detailHref: "/developers",
    },
    {
      id: "act-04",
      type: "payment_received",
      title: "Payment Received",
      description: "$45.50 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subHours(5),
      detailHref: "/transactions",
    },
    {
      id: "act-05",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(5.05),
      detailHref: "/developers",
    },
    {
      id: "act-06",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $8,200.50 USDC initiated to GTBank account",
      timestamp: subHours(8),
      detailHref: "/settlement",
    },

    // Yesterday
    {
      id: "act-07",
      type: "payment_received",
      title: "Payment Received",
      description: "$12,000.00 USDC received from GDZ...1T5 (API)",
      timestamp: subHours(26),
      detailHref: "/transactions",
    },
    {
      id: "act-08",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subHours(26.1),
      detailHref: "/developers",
    },
    {
      id: "act-09",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $5,000.00 USDC completed to GTBank account",
      timestamp: subHours(30),
      detailHref: "/settlement",
    },
    {
      id: "act-10",
      type: "api_key_used",
      title: "API Key Used",
      description: "Public key used for client checkout initialization",
      timestamp: subHours(35),
      detailHref: "/developers",
    },

    // 2 Days Ago
    {
      id: "act-11",
      type: "payment_received",
      title: "Payment Received",
      description: "$850.25 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subDays(2),
      detailHref: "/transactions",
    },
    {
      id: "act-12",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(2),
      detailHref: "/developers",
    },
    {
      id: "act-13",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $5,000.00 USDC initiated to GTBank account",
      timestamp: subDays(2.2),
      detailHref: "/settlement",
    },

    // 3 Days Ago
    {
      id: "act-14",
      type: "payment_received",
      title: "Payment Received",
      description: "$300.00 USDC received from GBX...4Q3 (Payment Link)",
      timestamp: subDays(3),
      detailHref: "/transactions",
    },
    {
      id: "act-15",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(3),
      detailHref: "/developers",
    },

    // 4 Days Ago
    {
      id: "act-16",
      type: "payment_received",
      title: "Payment Received",
      description: "$750.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(4),
      detailHref: "/transactions",
    },
    {
      id: "act-17",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(4),
      detailHref: "/developers",
    },
    {
      id: "act-18",
      type: "api_key_used",
      title: "API Key Used",
      description: "Live Secret Key verified for payment link creation",
      timestamp: subDays(4.1),
      detailHref: "/developers",
    },

    // 5 Days Ago
    {
      id: "act-19",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $12,450.00 USDC completed to GTBank account",
      timestamp: subDays(5),
      detailHref: "/settlement",
    },

    // 6 Days Ago
    {
      id: "act-20",
      type: "payment_received",
      title: "Payment Received",
      description: "$200.00 USDC received from GEA...3V9 (Payment Link)",
      timestamp: subDays(6),
      detailHref: "/transactions",
    },
    {
      id: "act-21",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(6),
      detailHref: "/developers",
    },

    // 7 Days Ago
    {
      id: "act-22",
      type: "payment_received",
      title: "Payment Received",
      description: "$120.00 USDC received from GKL...8W1 (QR Code)",
      timestamp: subDays(7),
      detailHref: "/transactions",
    },
    {
      id: "act-23",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(7),
      detailHref: "/developers",
    },
    {
      id: "act-24",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $12,450.00 USDC initiated to GTBank account",
      timestamp: subDays(7.1),
      detailHref: "/settlement",
    },

    // 10 Days Ago
    {
      id: "act-25",
      type: "payment_received",
      title: "Payment Received",
      description: "$90.00 USDC received from GAB...9X2 (Payment Link)",
      timestamp: subDays(10),
      detailHref: "/transactions",
    },
    {
      id: "act-26",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(10),
      detailHref: "/developers",
    },

    // 12 Days Ago
    {
      id: "act-27",
      type: "payment_received",
      title: "Payment Received",
      description: "$2,500.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(12),
      detailHref: "/transactions",
    },
    {
      id: "act-28",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(12.01),
      detailHref: "/developers",
    },

    // 14 Days Ago
    {
      id: "act-29",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $3,400.00 USDC completed to GTBank account",
      timestamp: subDays(14),
      detailHref: "/settlement",
    },

    // 15 Days Ago
    {
      id: "act-30",
      type: "payment_received",
      title: "Payment Received",
      description: "$50.00 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subDays(15),
      detailHref: "/transactions",
    },

    // 18 Days Ago
    {
      id: "act-31",
      type: "payment_received",
      title: "Payment Received",
      description: "$1,100.00 USDC received from GBX...4Q3 (QR Code)",
      timestamp: subDays(18),
      detailHref: "/transactions",
    },
    {
      id: "act-32",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(18.01),
      detailHref: "/developers",
    },

    // 20 Days Ago
    {
      id: "act-33",
      type: "settlement_initiated",
      title: "Settlement Initiated",
      description: "Settlement of $3,400.00 USDC initiated to GTBank account",
      timestamp: subDays(20),
      detailHref: "/settlement",
    },

    // 22 Days Ago
    {
      id: "act-34",
      type: "payment_received",
      title: "Payment Received",
      description: "$400.00 USDC received from GAB...9X2 (Payment Link)",
      timestamp: subDays(22),
      detailHref: "/transactions",
    },

    // 25 Days Ago
    {
      id: "act-35",
      type: "payment_received",
      title: "Payment Received",
      description: "$15.00 USDC received from GCY...8R2 (Payment Link)",
      timestamp: subDays(25),
      detailHref: "/transactions",
    },

    // 28 Days Ago
    {
      id: "act-36",
      type: "settlement_completed",
      title: "Settlement Completed",
      description: "Settlement of $1,800.00 USDC completed to First Bank account",
      timestamp: subDays(28),
      detailHref: "/settlement",
    },

    // 30 Days Ago
    {
      id: "act-37",
      type: "payment_received",
      title: "Payment Received",
      description: "$3,000.00 USDC received from GDZ...1T5 (API)",
      timestamp: subDays(30),
      detailHref: "/transactions",
    },
    {
      id: "act-38",
      type: "webhook_delivered",
      title: "Webhook Delivered",
      description: "payment.succeeded sent to https://api.acme.com/webhook",
      timestamp: subDays(30.01),
      detailHref: "/developers",
    },
  ];
}

async function fetchUpstreamEvents(
  base: string,
  path: string,
  cookie: string,
): Promise<unknown> {
  const res = await fetch(`${base}${path}`, { headers: { cookie } });
  if (!res.ok) return null;
  return res.json();
}

async function fetchPayments(base: string, cookie: string): Promise<ActivityEvent[]> {
  try {
    const json = await fetchUpstreamEvents(base, "/api/payments", cookie);
    if (!json) return [];
    const payload = json as { data?: RawPayment[] } | RawPayment[];
    const raw = Array.isArray(payload) ? payload : (payload.data ?? []);
    return raw.map((p) => ({
      id: p.id,
      type: "payment_received" as const,
      title: "Payment Received",
      description: `$${(p.amountUsdc || 0).toFixed(2)} USDC received from ${
        p.payerAddress
          ? p.payerAddress.slice(0, 4) + "..." + p.payerAddress.slice(-4)
          : "unknown"
      } (${p.source || "Payment Link"})`,
      timestamp: p.createdAt,
      detailHref: "/transactions",
    }));
  } catch (e) {
    console.error("Failed to fetch payments for activity", e);
    return [];
  }
}

async function fetchSettlements(base: string, cookie: string): Promise<ActivityEvent[]> {
  try {
    const json = await fetchUpstreamEvents(base, "/api/settlements", cookie);
    if (!json) return [];
    const payload = json as { data?: RawSettlement[] } | RawSettlement[];
    const raw = Array.isArray(payload) ? payload : (payload.data ?? []);
    return raw.map((s) => {
      const isCompleted = s.status === "COMPLETED" || s.status === "completed";
      return {
        id: s.id,
        type: isCompleted ? ("settlement_completed" as const) : ("settlement_initiated" as const),
        title: isCompleted ? "Settlement Completed" : "Settlement Initiated",
        description: `Settlement of $${(s.amountUsdc || 0).toFixed(2)} USDC ${
          isCompleted ? "completed" : "initiated"
        } to ${s.bankName || "bank"} account`,
        timestamp: s.createdAt,
        detailHref: "/settlement",
      };
    });
  } catch (e) {
    console.error("Failed to fetch settlements for activity", e);
    return [];
  }
}

async function fetchWebhooks(base: string, cookie: string): Promise<ActivityEvent[]> {
  try {
    const json = await fetchUpstreamEvents(base, "/api/webhooks/attempts", cookie);
    if (!json) return [];
    const payload = json as { data?: RawWebhook[] } | RawWebhook[];
    const raw = Array.isArray(payload) ? payload : (payload.data ?? []);
    return raw.map((w) => ({
      id: w.id,
      type: "webhook_delivered" as const,
      title: "Webhook Delivered",
      description: `${w.eventType || "event"} sent to ${w.targetUrl || "unknown"}`,
      timestamp: w.timestamp || w.createdAt || new Date().toISOString(),
      detailHref: "/developers",
    }));
  } catch {
    return [];
  }
}

async function fetchAuthSessions(base: string, cookie: string): Promise<ActivityEvent[]> {
  try {
    const json = await fetchUpstreamEvents(base, "/api/auth/sessions", cookie);
    if (!json) return [];
    const payload = json as { active?: RawSession[]; history?: RawSession[] };
    const allSessions = [...(payload.active ?? []), ...(payload.history ?? [])];
    return allSessions.map((s) => ({
      id: `auth-${s.id}`,
      type: "api_key_used" as const,
      title: "Session Active",
      description: `Session active from IP ${s.ipAddress || "unknown"} (${s.userAgent || "unknown"})`,
      timestamp: s.createdAt || s.lastActiveAt || new Date().toISOString(),
      detailHref: "/settings/sessions",
    }));
  } catch {
    return [];
  }
}

/** Fan out to the backend and merge everything into one recency-sorted feed. */
export async function collectUpstreamActivity(
  base: string,
  cookie = "",
): Promise<ActivityEvent[]> {
  const [payments, settlements, webhooks, sessions] = await Promise.all([
    fetchPayments(base, cookie),
    fetchSettlements(base, cookie),
    fetchWebhooks(base, cookie),
    fetchAuthSessions(base, cookie),
  ]);
  const events = [...payments, ...settlements, ...webhooks, ...sessions];
  events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return events;
}

/** Keeps only the requested event family; `all`/unknown filters return everything. */
export function filterActivityEvents(
  events: ActivityEvent[],
  filter?: string | null,
): ActivityEvent[] {
  if (filter === "payments") {
    return events.filter((e) => e.type === "payment_received");
  }
  if (filter === "settlements") {
    return events.filter(
      (e) => e.type === "settlement_initiated" || e.type === "settlement_completed",
    );
  }
  if (filter === "webhooks") {
    return events.filter((e) => e.type === "webhook_delivered");
  }
  return events;
}

/** Cursor pagination: an unknown cursor restarts from the first page. */
export function paginateActivityEvents(
  events: ActivityEvent[],
  { limit, cursor }: { limit: number; cursor?: string | null },
): ActivityPage {
  let startIndex = 0;
  if (cursor) {
    const cursorIndex = events.findIndex((e) => e.id === cursor);
    if (cursorIndex !== -1) startIndex = cursorIndex + 1;
  }

  const data = events.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < events.length;
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null;
  return { data, nextCursor };
}

/**
 * One page of merchant activity. Uses the backend when it is a real host and
 * the deterministic mock feed when the upstream is localhost (self-loop) or
 * unreachable — a failed source degrades to an empty contribution.
 */
export async function listMerchantActivity(query: ListActivityQuery): Promise<ActivityPage> {
  const base = resolveUpstreamBase(query.upstreamBase);
  const events = isSelfLoop(base)
    ? buildMockActivityEvents(query.now)
    : await collectUpstreamActivity(base, query.cookie ?? "");

  const filtered = filterActivityEvents(events, query.filter);
  return paginateActivityEvents(filtered, {
    limit: parseActivityLimit(query.limit),
    cursor: query.cursor,
  });
}

// ─── Team management ────────────────────────────────────────────────────────

export const inviteSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address." }),
  role: z.enum(MERCHANT_ROLES),
});

/** Machine-readable failure reasons; routes map them to HTTP status codes. */
export type TeamErrorCode = "invalid_body" | "forbidden" | "conflict";

export type TeamResult =
  | { ok: true; member: TeamMember }
  | { ok: false; code: TeamErrorCode; error: string };

export interface InviteTeamInput {
  merchantId: string;
  /** Who performed the invite — recorded in the audit trail. */
  actor: string;
  /** Caller's session role; `viewer` cannot mutate the team (issue #465). */
  role?: string | null;
  /** Untrusted JSON body from the request. */
  body: unknown;
}

/**
 * Team mutations require `team.manage`. The session does not yet carry a
 * per-merchant role, so the platform role is used as a proxy: viewers are
 * read-only. Replace with `can(session.merchantRole, "team.manage")` once
 * #465's session change lands.
 */
export function canManageTeam(role: string | null | undefined): boolean {
  return role !== "viewer";
}

export function listTeamMembers(merchantId: string): {
  members: TeamMember[];
  audit: ReturnType<typeof listTeam>["audit"];
} {
  return listTeam(merchantId);
}

/** Validates the invite payload and records the pending member. */
export function inviteTeamMember(input: InviteTeamInput): TeamResult {
  if (!canManageTeam(input.role)) {
    return {
      ok: false,
      code: "forbidden",
      error: "You do not have permission to manage the team.",
    };
  }

  const parsed = inviteSchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_body",
      error: parsed.error.issues[0]?.message ?? "Invalid invite.",
    };
  }

  const result = inviteMember(
    input.merchantId,
    input.actor,
    parsed.data.email,
    parsed.data.role,
  );
  if (!result.ok) {
    return { ok: false, code: "conflict", error: result.error };
  }
  return { ok: true, member: result.member };
}
