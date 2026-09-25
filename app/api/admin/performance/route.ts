/**
 * GET /api/admin/performance
 *
 * Admin-only endpoint providing aggregated RUM performance data.
 *
 * - Requires a backend-verified admin session (see guardAdminApi)
 * - Provides route-level LCP/CLS trends, percentiles, distributions
 * - Never returns PII
 * - Handles empty datasets gracefully
 * - Efficient bounded queries against the in-memory store
 */

import { NextResponse } from "next/server";
import { guardAdminApi } from "@/lib/auth/adminApiGuard";
import { z } from "zod";
import {
  queryEvents,
  getRoutes,
  getEventCount,
} from "@/lib/rum/store";
import {
  calculatePercentiles,
  computeTrend,
  computeDistribution,
} from "@/lib/rum/aggregate";
import type { RumMetricName } from "@/lib/rum/types";

// Query parameter schema
const querySchema = z
  .object({
    route: z.string().optional(),
    metric: z
      .enum([
        "fcp",
        "lcp",
        "cls",
        "long_task",
        "ttfb",
        "domContentLoaded",
        "load",
        "route_change",
        "hydration_error",
      ])
      .optional()
      .default("lcp"),
    days: z.coerce.number().min(1).max(90).optional().default(7),
    limit: z.coerce.number().min(1).max(1000).optional().default(100),
  })
  .strict();

export async function GET(req: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const parsed = querySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { route, metric, days, limit } = parsed.data;
    const metricName = metric as RumMetricName;

    const since = Date.now() - days * 86400000;
    const routes = getRoutes();
    const totalEvents = getEventCount();

    // If no data at all
    if (routes.length === 0 || totalEvents === 0) {
      return NextResponse.json(
        {
          routes: [],
          metrics: [],
          timeRange: { from: new Date(since).toISOString(), to: new Date().toISOString() },
          totalEvents: 0,
          data: null,
        },
        {
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Query events for the specified metric
    const events = queryEvents({
      metricName,
      since,
      limit: 10000, // Bounded query
    });

    // Compute overall percentiles
    const allValues = events.map((e) => e.value);
    const percentiles = calculatePercentiles(allValues);

    // Compute trend (grouped by day)
    const trend = computeTrend(events);

    // Compute route-level summaries
    const routeSummaries = routes.map((r) => {
      const routeEvents = events.filter((e) => e.route === r);
      const values = routeEvents.map((e) => e.value);
      return {
        route: r,
        percentiles: calculatePercentiles(values),
        count: values.length,
      };
    });

    // Distribution for the selected route (or overall if no route specified)
    const distributionEvents = route
      ? events.filter((e) => e.route === route)
      : events;
    const distributionValues = distributionEvents.map((e) => e.value);
    const distribution = computeDistribution(distributionValues, metricName);

    // Available metrics (those that have data)
    const availableMetrics: RumMetricName[] = [];
    const allEvents = queryEvents({ since, limit: 10000 });
    const metricSet = new Set(allEvents.map((e) => e.name));
    for (const m of [
      "fcp",
      "lcp",
      "cls",
      "long_task",
      "ttfb",
      "domContentLoaded",
      "load",
      "route_change",
      "hydration_error",
    ] as RumMetricName[]) {
      if (metricSet.has(m)) availableMetrics.push(m);
    }

    return NextResponse.json(
      {
        routes,
        metrics: availableMetrics,
        timeRange: {
          from: new Date(since).toISOString(),
          to: new Date().toISOString(),
        },
        totalEvents,
        data: {
          metric: metricName,
          percentiles,
          trend,
          routeSummaries: routeSummaries
            .filter((r) => r.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, limit),
          distribution,
          route: route || null,
          sampleCount: events.length,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
