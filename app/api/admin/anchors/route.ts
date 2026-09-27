/**
 * GET  /api/admin/anchors  – List all anchors (enabled + disabled)
 * POST /api/admin/anchors  – Create a new anchor
 *
 * Admin-only. The middleware protects /anchors as an admin route and this
 * route re-verifies the role against the backend session (guardAdminApi).
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { anchorStore } from "@/lib/mock/anchors";
import type { Anchor, KycLevel } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  return NextResponse.json(
    { data: anchorStore },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, code, currency, country, flag, kycLevels, settlementTime, websiteUrl } = body as {
    name?: string;
    code?: string;
    currency?: string;
    country?: string;
    flag?: string;
    kycLevels?: KycLevel[];
    settlementTime?: string;
    websiteUrl?: string | null;
  };

  if (!name || !code || !currency || !country) {
    return NextResponse.json(
      { error: "name, code, currency, and country are required" },
      { status: 400 }
    );
  }

  if (anchorStore.some((a) => a.code === code)) {
    return NextResponse.json(
      { error: `Anchor with code "${code}" already exists` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const anchor: Anchor = {
    id: `anc_${Date.now()}`,
    name,
    code: code.toUpperCase(),
    currency: currency.toUpperCase(),
    country,
    flag: flag ?? "",
    kycLevels: kycLevels ?? ["basic"],
    settlementTime: settlementTime ?? "Pending",
    websiteUrl: websiteUrl ?? null,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };

  anchorStore.push(anchor);

  return NextResponse.json({ data: anchor }, { status: 201 });
}
