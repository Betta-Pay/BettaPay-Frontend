/**
 * Central manifest for the Integration Guides (/guides).
 *
 * Each guide page and the listing page read from this single source so that
 * ordering, next/previous navigation, reading time, and difficulty stay in
 * sync everywhere. To add a guide, append an entry here and create the matching
 * `app/guides/<slug>/page.tsx`.
 */

export type GuideDifficulty = "beginner" | "intermediate" | "advanced";

export interface GuideMeta {
  /** URL slug — matches the folder under app/guides/<slug>/ */
  slug: string;
  /** Absolute route to the guide */
  href: string;
  title: string;
  /** One-line subtitle shown under the title in the article header */
  subtitle: string;
  /** Longer description used on the listing card */
  description: string;
  /** Human-readable estimated reading time, e.g. "12 min" */
  readingTime: string;
  difficulty: GuideDifficulty;
  tags: string[];
  author: string;
  /** ISO date (YYYY-MM-DD) the guide was last updated */
  lastUpdated: string;
  /** Explicit ordering for the listing grid and prev/next navigation */
  order: number;
}

export const guides: GuideMeta[] = [
  {
    slug: "first-payment",
    href: "/guides/first-payment",
    title: "Accepting Your First Payment",
    subtitle:
      "Go from zero to a live payment link and your first on-chain payment on Stellar testnet.",
    description:
      "The no-code path: create a merchant account, build a payment link, and collect a USDC payment with the Freighter wallet — end to end, no server required.",
    readingTime: "12 min",
    difficulty: "beginner",
    tags: ["payment-links", "no-code", "freighter", "testnet"],
    author: "BettaPay Team",
    lastUpdated: "2026-07-19",
    order: 1,
  },
  {
    slug: "server-to-server",
    href: "/guides/server-to-server",
    title: "Server-to-Server Integration",
    subtitle:
      "Create and reconcile payments programmatically with idempotency, FX conversion, and resilient error handling.",
    description:
      "Drive BettaPay from your backend: authenticate, create payments with idempotency keys, handle FX quotes, and reconcile status via polling or webhooks. Includes a complete Express.js server.",
    readingTime: "18 min",
    difficulty: "intermediate",
    tags: ["api", "express", "idempotency", "fx", "backend"],
    author: "BettaPay Team",
    lastUpdated: "2026-07-19",
    order: 2,
  },
  {
    slug: "webhook-handling",
    href: "/guides/webhook-handling",
    title: "Webhook Handling & Retry Logic",
    subtitle:
      "Receive events reliably: verify signatures, deduplicate, and survive retries with a dead-letter queue.",
    description:
      "Build a production-grade webhook receiver: HMAC-SHA256 signature verification in Node.js, Python, and PHP, idempotent deduplication, the BettaPay retry schedule, and a dead-letter queue.",
    readingTime: "16 min",
    difficulty: "intermediate",
    tags: ["webhooks", "hmac", "idempotency", "reliability"],
    author: "BettaPay Team",
    lastUpdated: "2026-07-19",
    order: 3,
  },
  {
    slug: "fiat-settlement",
    href: "/guides/fiat-settlement",
    title: "Fiat Settlement Configuration",
    subtitle:
      "Turn on-chain USDC into local fiat: configure anchors, initiate settlements, and track them to completion.",
    description:
      "Configure SEP-24 anchors, run settlements from the dashboard or API, follow the PENDING → PROCESSING → COMPLETED lifecycle, and handle settlement webhooks and KYC requirements.",
    readingTime: "15 min",
    difficulty: "advanced",
    tags: ["settlement", "sep-24", "anchors", "fiat", "compliance"],
    author: "BettaPay Team",
    lastUpdated: "2026-07-19",
    order: 4,
  },
  {
    slug: "testnet-testing",
    href: "/guides/testnet-testing",
    title: "Testing with Stellar Testnet",
    subtitle:
      "Build a safe development loop with Freighter, friendbot, test USDC, and the Stellar Laboratory.",
    description:
      "Set up a repeatable testnet workflow: switch Freighter to testnet, fund accounts with friendbot, get test USDC, run a full test payment, and inspect transactions in Stellar Laboratory.",
    readingTime: "10 min",
    difficulty: "beginner",
    tags: ["testnet", "freighter", "friendbot", "stellar-lab", "development"],
    author: "BettaPay Team",
    lastUpdated: "2026-07-19",
    order: 5,
  },
];

/** Guides sorted by their explicit `order` field. */
export const orderedGuides: GuideMeta[] = [...guides].sort(
  (a, b) => a.order - b.order
);

/** Look up a single guide by slug. */
export function getGuide(slug: string): GuideMeta | undefined {
  return guides.find((guide) => guide.slug === slug);
}

/**
 * Resolve the previous/next guide relative to a slug, following `order`.
 * Returns `null` for either side when the guide is first/last (or unknown).
 */
export function getAdjacentGuides(slug: string): {
  prev: GuideMeta | null;
  next: GuideMeta | null;
} {
  const index = orderedGuides.findIndex((guide) => guide.slug === slug);
  if (index === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? orderedGuides[index - 1] : null,
    next: index < orderedGuides.length - 1 ? orderedGuides[index + 1] : null,
  };
}

/** Tailwind classes for each difficulty badge, matched to the theme tokens. */
export const difficultyBadgeStyles: Record<GuideDifficulty, string> = {
  beginner:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  intermediate:
    "bg-info/10 text-info border-info/20 dark:bg-info/20 dark:text-info",
  advanced:
    "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary",
};
