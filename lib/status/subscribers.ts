import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

// Storage for status-page subscriptions.
//
// The subscribe form used to be optimistic-only: it flipped to "You're
// subscribed" on submit without talking to a server, so every subscriber got a
// confirmation for a record that never existed. This module is the record.
//
// It is process-local and in-memory, matching the other mock-backed routes in
// this app (see `lib/notifications.ts`). Swapping in a real database means
// reimplementing `addSubscriber` / `findSubscriber` / `listSubscribers`; the
// route and the form do not need to change.

const STATUS_TOKEN_SECRET =
  process.env.STATUS_TOKEN_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "bettapay-status-subscriber-secret";

/** Generate a signed status / unsubscribe token for an email address. */
export function generateSubscriberToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", STATUS_TOKEN_SECRET)
    .update(`status-subscriber:${normalized}`)
    .digest("hex");
}

/** Verify a signed status / unsubscribe token for an email address. */
export function verifySubscriberToken(email: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = generateSubscriberToken(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export interface StatusSubscriber {
  id: string;
  /** Normalized (trimmed, lower-cased) address — this is the dedupe key. */
  email: string;
  token?: string;
  createdAt: string;
}

export type SubscribeResult =
  | { status: "created"; subscriber: StatusSubscriber }
  | { status: "duplicate"; subscriber: StatusSubscriber };

/**
 * Email validation shared by the route and the form, so the client and the
 * server can never disagree about what counts as a valid address.
 */
export const subscriberEmailSchema = z
  .string({ message: "Enter your email address." })
  .trim()
  .min(1, { message: "Enter your email address." })
  .max(254, { message: "That email address is too long." })
  .email({ message: "Enter a valid email address." })
  .transform((value) => value.toLowerCase());

export const subscribeRequestSchema = z.object({
  email: subscriberEmailSchema,
});

/** Normalize an address to its dedupe key, or null if it is not valid. */
export function normalizeEmail(raw: unknown): string | null {
  const parsed = subscriberEmailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

interface SubscriberStore {
  /** Keyed by normalized email so duplicates are structurally impossible. */
  byEmail: Map<string, StatusSubscriber>;
}

const STORE_KEY = "__bettapayStatusSubscribers__";

function getStore(): SubscriberStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: SubscriberStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = { byEmail: new Map() };
  }

  return globalStore[STORE_KEY]!;
}

/**
 * Record a subscription. Returns `duplicate` (with the original record) when
 * the address is already subscribed, so the caller can say so plainly instead
 * of silently creating a second row or pretending it succeeded.
 */
export function addSubscriber(email: string): SubscribeResult {
  const store = getStore();
  const existing = store.byEmail.get(email);

  if (existing) {
    return { status: "duplicate", subscriber: existing };
  }

  const subscriber: StatusSubscriber = {
    id: `sub_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    email,
    token: generateSubscriberToken(email),
    createdAt: new Date().toISOString(),
  };

  store.byEmail.set(email, subscriber);
  return { status: "created", subscriber };
}

export function findSubscriber(email: string): StatusSubscriber | null {
  return getStore().byEmail.get(email) ?? null;
}

export function listSubscribers(): StatusSubscriber[] {
  return Array.from(getStore().byEmail.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

export function countSubscribers(): number {
  return getStore().byEmail.size;
}

/** Test hook — drops every record. */
export function resetSubscribers(): void {
  getStore().byEmail.clear();
}
