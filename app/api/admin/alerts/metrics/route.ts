/**
 * POST /api/admin/alerts/metrics – ingest one metric sample and evaluate.
 *
 * Body: { metric, value, at? }. The ingest point for the metric producers
 * (and the dev "Simulate metric" panel). Admin-only.
 */
import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { addSample, evaluateAll } from "@/lib/alerts/evaluator";
import { isAlertMetric } from "@/lib/alerts/rules";
import { getAlertStore } from "@/lib/alerts/store";
import { buildFeed } from "@/lib/alerts/serialize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  let body: { metric?: unknown; value?: unknown; at?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAlertMetric(body.metric)) {
    return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  }
  if (typeof body.value !== "number" || !Number.isFinite(body.value) || body.value < 0) {
    return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
  }
  const at = typeof body.at === "string" && !Number.isNaN(Date.parse(body.at)) ? body.at : new Date().toISOString();

  const store = getAlertStore();
  addSample(store, { metric: body.metric, value: body.value, at });
  const changed = evaluateAll(store);

  return NextResponse.json(
    { changed: changed.map((e) => e.id), ...buildFeed(null) },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
