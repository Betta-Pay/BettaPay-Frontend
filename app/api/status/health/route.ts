/**
 * GET /api/status/health
 *
 * Public, unauthenticated system-health endpoint that backs the marketing
 * status page (`/status`). It runs the same server-side probes as the
 * admin endpoint (`/api/admin/health`) but is deliberately reachable by
 * anonymous visitors — a status page that only admins can load is useless.
 *
 * Only client-safe fields are returned: the probe functions in
 * `lib/health/checkers.ts` already sanitise error messages (no stack
 * traces, no credentials, URLs redacted). As an extra precaution this
 * route strips the optional `meta` bag so no endpoint hostnames leak to
 * the public page.
 */

import { NextResponse } from "next/server";
import type { HealthResponse, ServiceHealth } from "@/lib/types/health";
import {
  checkHorizon,
  checkSoroban,
  checkSep24,
  checkPostgres,
} from "@/lib/health/checkers";

export const runtime = "nodejs"; // Node fetch with AbortSignal.timeout
export const dynamic = "force-dynamic"; // never statically cached

/** Drop non-essential / potentially identifying fields before returning. */
function toPublicService(service: ServiceHealth): ServiceHealth {
  const publicService: ServiceHealth = { ...service };
  delete publicService.meta;
  return publicService;
}

export async function GET() {
  // Run all probes concurrently — a single slow probe cannot block the others.
  const [horizon, soroban, sep24, postgres] = await Promise.all([
    checkHorizon(),
    checkSoroban(),
    checkSep24(),
    checkPostgres(),
  ]);

  const body: HealthResponse = {
    aggregatedAt: new Date().toISOString(),
    services: [horizon, soroban, sep24, postgres].map(toPublicService),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Health data must always be fresh — never cache at the CDN/edge.
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}
