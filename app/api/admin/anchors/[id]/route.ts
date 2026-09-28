/**
 * GET    /api/admin/anchors/[id]  – Get anchor detail
 * PUT    /api/admin/anchors/[id]  – Update anchor metadata
 * PATCH  /api/admin/anchors/[id]  – Partial update (toggle enabled, etc.)
 * DELETE /api/admin/anchors/[id]  – Remove anchor
 *
 * Admin-only; role verified against the backend session (guardAdminApi).
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { anchorStore, mockAnchorStats } from "@/lib/mock/anchors";
import type { Anchor, KycLevel } from "@/lib/types";

export const runtime = "nodejs";

function findIndex(id: string): number {
  return anchorStore.findIndex((a) => a.id === id);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const anchor = anchorStore.find((a) => a.id === id);
  if (!anchor) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }

  const stats = mockAnchorStats[id] ?? null;

  return NextResponse.json(
    { data: { ...anchor, stats } },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const idx = findIndex(id);
  if (idx === -1) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    code,
    currency,
    country,
    flag,
    kycLevels,
    settlementTime,
    websiteUrl,
    enabled,
  } = body as {
    name?: string;
    code?: string;
    currency?: string;
    country?: string;
    flag?: string;
    kycLevels?: KycLevel[];
    settlementTime?: string;
    websiteUrl?: string | null;
    enabled?: boolean;
  };

  const existing = anchorStore[idx];

  if (code && code !== existing.code) {
    if (anchorStore.some((a) => a.code === code.toUpperCase() && a.id !== id)) {
      return NextResponse.json(
        { error: `Anchor with code "${code}" already exists` },
        { status: 409 }
      );
    }
  }

  const updated: Anchor = {
    ...existing,
    name: name ?? existing.name,
    code: code ? code.toUpperCase() : existing.code,
    currency: currency ? currency.toUpperCase() : existing.currency,
    country: country ?? existing.country,
    flag: flag ?? existing.flag,
    kycLevels: kycLevels ?? existing.kycLevels,
    settlementTime: settlementTime ?? existing.settlementTime,
    websiteUrl: websiteUrl !== undefined ? websiteUrl : existing.websiteUrl,
    enabled: enabled !== undefined ? enabled : existing.enabled,
    updatedAt: new Date().toISOString(),
  };

  anchorStore[idx] = updated;

  return NextResponse.json({ data: updated }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const idx = findIndex(id);
  if (idx === -1) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = body as Partial<Pick<Anchor, "enabled" | "name" | "kycLevels" | "settlementTime">>;

  anchorStore[idx] = {
    ...anchorStore[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: anchorStore[idx] }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  const { id } = await params;
  const idx = findIndex(id);
  if (idx === -1) {
    return NextResponse.json({ error: "Anchor not found" }, { status: 404 });
  }

  anchorStore.splice(idx, 1);

  return NextResponse.json({ data: { deleted: true } }, { status: 200 });
}
