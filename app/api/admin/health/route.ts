/**
 * GET /api/admin/health
 *
 * Aggregated system health endpoint. Runs all four service probes in
 * parallel and returns a single JSON payload. This is the only endpoint
 * the client ever calls, preventing N parallel browser requests.
 *
 * This route is server-side only — no credentials or internal URLs are
 * forwarded to the browser.
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import type { HealthResponse } from "@/lib/types/health";
import {
  checkHorizon,
  checkSoroban,
  checkSep24,
  checkPostgres,
} from "@/lib/health/checkers";

export const runtime = "nodejs"; // ensure fetch is the Node fetch with AbortSignal.timeout

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;

  // Run all probes concurrently — a single slow probe cannot block the others.
  const [horizon, soroban, sep24, postgres] = await Promise.all([
    checkHorizon(),
    checkSoroban(),
    checkSep24(),
    checkPostgres(),
  ]);

  const body: HealthResponse = {
    aggregatedAt: new Date().toISOString(),
    services: [horizon, soroban, sep24, postgres],
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Prevent CDN/edge caching — health data must be fresh.
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
