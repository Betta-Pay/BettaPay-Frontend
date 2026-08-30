import type {
  HealthResponse,
  ServiceHealth,
  ServiceName,
  ServiceStatus,
} from "@/lib/types/health";

// ─── Public status vocabulary ────────────────────────────────────────────────
//
// The public status page previously ran on a hand-written array of component
// states and fixed incident dates, so it could cheerfully report "All Systems
// Operational" while a service was down. Everything here is now derived from a
// live `HealthResponse` (see `/api/status/health`); nothing is hardcoded except
// the display names of the four probed services.

export type ComponentStatusLevel =
  | "operational"
  | "degraded"
  | "down"
  | "unknown";

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatusLevel;
  /** Round-trip latency of the last probe, in ms, when measurable. */
  latencyMs: number | null;
  /** ISO 8601 timestamp of the last probe, or null when never probed. */
  checkedAt: string | null;
  /** Sanitised, user-facing error from the last failed probe. */
  errorMessage: string | null;
}

export interface IncidentUpdate {
  status: "investigating" | "identified" | "monitoring" | "resolved";
  message: string;
  /** ISO 8601 timestamp. */
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affectedComponents: string[];
  updates: IncidentUpdate[];
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp, or null while the incident is still open. */
  resolvedAt: string | null;
}

// ─── Known services ──────────────────────────────────────────────────────────
//
// Display names for the probes exposed by `lib/health/checkers.ts`. Used to
// render "unknown" placeholder cards before the first successful poll (or when
// the health endpoint itself is unreachable) so the page never simply omits a
// service it cannot currently see.

const SERVICE_NAMES: Record<ServiceName, string> = {
  horizon: "Horizon API",
  soroban: "Soroban RPC",
  sep24: "SEP-24 Anchor",
  postgres: "PostgreSQL",
};

const KNOWN_SERVICE_IDS = Object.keys(SERVICE_NAMES) as ServiceName[];

/** Map a probe's health status onto the public status vocabulary. */
export function healthStatusToLevel(
  status: ServiceStatus,
): ComponentStatusLevel {
  switch (status) {
    case "healthy":
      return "operational";
    case "degraded":
      return "degraded";
    case "unhealthy":
      return "down";
    default:
      return "unknown";
  }
}

function serviceToComponent(service: ServiceHealth): StatusComponent {
  return {
    id: service.service,
    name: service.label || SERVICE_NAMES[service.service] || service.service,
    status: healthStatusToLevel(service.status),
    latencyMs: service.latencyMs ?? null,
    checkedAt: service.checkedAt ?? null,
    errorMessage: service.errorMessage ?? null,
  };
}

function unknownComponent(id: ServiceName): StatusComponent {
  return {
    id,
    name: SERVICE_NAMES[id],
    status: "unknown",
    latencyMs: null,
    checkedAt: null,
    errorMessage: null,
  };
}

/**
 * Turn a live `HealthResponse` into the component list the status page renders.
 * When `data` is null (first load, or the health endpoint is unreachable),
 * every known service is reported as `unknown` — never a fabricated
 * "operational".
 */
export function mapServicesToComponents(
  data: HealthResponse | null | undefined,
): StatusComponent[] {
  if (!data || !Array.isArray(data.services) || data.services.length === 0) {
    return KNOWN_SERVICE_IDS.map(unknownComponent);
  }

  const seen = new Set<string>();
  const components = data.services.map((service) => {
    seen.add(service.service);
    return serviceToComponent(service);
  });

  // Backfill any known service the payload omitted so the grid stays stable.
  for (const id of KNOWN_SERVICE_IDS) {
    if (!seen.has(id)) components.push(unknownComponent(id));
  }

  return components;
}

/**
 * Synthesise the incident timeline from the *current* health snapshot. There
 * is no incident store in this codebase, so an "incident" is any service that
 * is degraded or down right now, timestamped with that service's real
 * `checkedAt`. When everything is healthy the list is empty and the timeline
 * renders its "No Incidents" state. No timestamp here is hardcoded.
 */
export function deriveIncidents(components: StatusComponent[]): Incident[] {
  const now = new Date().toISOString();

  return components
    .filter((c) => c.status === "degraded" || c.status === "down")
    .map((c) => {
      const isDown = c.status === "down";
      const timestamp = c.checkedAt ?? now;
      const updateStatus: IncidentUpdate["status"] = isDown
        ? "identified"
        : "investigating";
      const message =
        c.errorMessage ??
        (isDown
          ? "The service is not responding to health probes."
          : "The service is responding slowly or returning elevated errors.");

      return {
        id: `live-${c.id}`,
        title: `${c.name} — ${
          isDown ? "Service Unreachable" : "Degraded Performance"
        }`,
        status: updateStatus,
        affectedComponents: [c.id],
        updates: [{ status: updateStatus, message, timestamp }],
        createdAt: timestamp,
        resolvedAt: null,
      };
    });
}

/** Display name for a component id, falling back to the id itself. */
export function getComponentName(id: string): string {
  return SERVICE_NAMES[id as ServiceName] ?? id;
}

/**
 * Overall banner state. Missing data (all services `unknown`) reports
 * "Status Unknown" rather than a green "All Systems Operational".
 */
export function getOverallStatus(components: StatusComponent[]): {
  level: ComponentStatusLevel;
  label: string;
} {
  if (components.length === 0 || components.every((c) => c.status === "unknown")) {
    return { level: "unknown", label: "Status Unknown" };
  }

  if (components.some((c) => c.status === "down")) {
    return { level: "down", label: "Major Outage" };
  }
  if (components.some((c) => c.status === "degraded")) {
    return { level: "degraded", label: "Partial Outage" };
  }
  if (components.some((c) => c.status === "unknown")) {
    return { level: "degraded", label: "Partial Degradation" };
  }
  return { level: "operational", label: "All Systems Operational" };
}
