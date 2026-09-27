/**
 * GET /api/admin/anchors/health
 *
 * Runs SEP-24 probes against every enabled anchor's endpoint in parallel
 * and returns a health matrix. Disabled anchors are reported as "unchecked".
 *
 * This is the live replacement for the static SEP-24 single-URL probe —
 * each anchor gets its own HEAD request to /.well-known/stellar.toml.
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { anchorStore, mockAnchorStats } from "@/lib/mock/anchors";
import { checkSep24Anchor } from "@/lib/health/checkers";
import type { AnchorHealth } from "@/lib/types";

export const runtime = "nodejs";

/** Well-known SEP-24 anchor URLs keyed by anchor code. */
const ANCHOR_ENDPOINTS: Record<string, string> = {
  COWRIE: "https://testanchor.stellar.org",
  TEMPO: "https://testanchor.stellar.org",
  MONEYGRAM: "https://testanchor.stellar.org",
  YELLOWCARD: "https://testanchor.stellar.org",
  AZA: "https://testanchor.stellar.org",
  CLICKATELL: "https://testanchor.stellar.org",
};

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const probes: Promise<AnchorHealth>[] = anchorStore.map((anchor) => {
    if (!anchor.enabled) {
      return Promise.resolve({
        anchorId: anchor.id,
        status: "unchecked" as const,
        latencyMs: null,
        checkedAt: new Date().toISOString(),
      });
    }

    const endpoint =
      ANCHOR_ENDPOINTS[anchor.code] ??
      process.env.NEXT_PUBLIC_ANCHOR_URL ??
      "https://testanchor.stellar.org";

    return checkSep24Anchor(anchor.id, endpoint);
  });

  const [healthResults, statsResults] = await Promise.all([
    Promise.all(probes),
    Promise.resolve(anchorStore.map((a) => mockAnchorStats[a.id] ?? null)),
  ]);

  const healthMap = new Map(healthResults.map((h) => [h.anchorId, h]));
  const statsMap = new Map(
    anchorStore.map((a, i) => [a.id, statsResults[i]])
  );

  const matrix = anchorStore.map((anchor) => ({
    ...anchor,
    health: healthMap.get(anchor.id) ?? null,
    stats: statsMap.get(anchor.id) ?? null,
  }));

  return NextResponse.json(
    { data: matrix, checkedAt: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
