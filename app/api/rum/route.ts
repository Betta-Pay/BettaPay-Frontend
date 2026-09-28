/**
 * POST /api/rum
 *
 * Accepts batched RUM events from the frontend collector.
 *
 * - Validates request body strictly against the supported schema
 * - Rejects malformed/oversized payloads
 * - Validates metric names and numeric ranges
 * - Normalizes route values
 * - Never logs raw RUM payloads
 * - Makes ingestion failure non-fatal (returns 204 even on errors)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { storeEvents } from "@/lib/rum/store";
import { normalizeRoute } from "@/lib/rum/normalize";
import type { RumEvent, RumMetricName } from "@/lib/rum/types";

// Maximum allowed events per request
const MAX_BATCH_SIZE = 50;

// Maximum allowed payload size (bytes) — 64KB
const MAX_PAYLOAD_SIZE = 64 * 1024;

// Valid metric names
const VALID_METRICS: ReadonlySet<string> = new Set([
  "fcp",
  "lcp",
  "cls",
  "long_task",
  "ttfb",
  "domContentLoaded",
  "load",
  "route_change",
  "hydration_error",
]);

// Zod schema for a single event
const rumEventSchema = z
  .object({
    clientId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-f0-9]+$/, "clientId must be hex string"),
    route: z.string().min(1).max(256),
    name: z.string().refine((val) => VALID_METRICS.has(val), {
      message: "Invalid metric name",
    }),
    value: z.number().finite().min(-100000).max(10000000),
    navigationType: z.string().optional(),
    timestamp: z.number().positive().max(Date.now() + 86400000),
    appVersion: z.string().max(64).optional(),
  })
  .strict();

// Zod schema for the batch payload
const batchSchema = z
  .object({
    events: z.array(rumEventSchema).min(1).max(MAX_BATCH_SIZE),
  })
  .strict();

function noContent() {
  // 204 responses must not carry a body; `NextResponse.json` would throw
  // `Response constructor: Invalid response status code 204`.
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: Request) {
  try {
    // Check Content-Length early to reject oversized payloads
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Validate against schema
    const result = batchSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid payload";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { events } = result.data;

    // Normalize routes and build validated events
    const validEvents: RumEvent[] = [];
    for (const raw of events) {
      validEvents.push({
        clientId: raw.clientId,
        route: normalizeRoute(raw.route),
        name: raw.name as RumMetricName,
        value: raw.value,
        navigationType: raw.navigationType as RumEvent["navigationType"],
        timestamp: raw.timestamp,
        appVersion: raw.appVersion,
      });
    }

    // Store validated events
    if (validEvents.length > 0) {
      storeEvents(validEvents);
    }

    return noContent();
  } catch {
    // Non-fatal: ingestion failure must never surface to the frontend
    return noContent();
  }
}
