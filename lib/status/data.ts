export type ComponentStatusLevel = "operational" | "degraded" | "down";

export interface StatusComponent {
  id: string;
  name: string;
  status: ComponentStatusLevel;
  uptimePercent: number;
  lastIncident: string | null;
}

export interface IncidentUpdate {
  status: "investigating" | "identified" | "monitoring" | "resolved";
  message: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affectedComponents: string[];
  updates: IncidentUpdate[];
  createdAt: string;
  resolvedAt: string | null;
}

export const mockComponents: StatusComponent[] = [
  {
    id: "api",
    name: "Payment API",
    status: "operational",
    uptimePercent: 99.98,
    lastIncident: null,
  },
  {
    id: "dashboard",
    name: "Merchant Dashboard",
    status: "operational",
    uptimePercent: 99.95,
    lastIncident: "2026-07-10T14:00:00Z",
  },
  {
    id: "payments",
    name: "Payment Processing",
    status: "operational",
    uptimePercent: 99.99,
    lastIncident: null,
  },
  {
    id: "settlements",
    name: "Fiat Settlements",
    status: "degraded",
    uptimePercent: 99.12,
    lastIncident: "2026-07-22T08:30:00Z",
  },
  {
    id: "fx-engine",
    name: "FX Engine",
    status: "operational",
    uptimePercent: 99.97,
    lastIncident: null,
  },
  {
    id: "indexer",
    name: "Stellar Indexer",
    status: "operational",
    uptimePercent: 100.0,
    lastIncident: null,
  },
];

export const mockIncidents: Incident[] = [
  {
    id: "inc_001",
    title: "Fiat Settlement Delay — Nigerian Naira Payouts",
    status: "identified",
    affectedComponents: ["settlements"],
    createdAt: "2026-07-22T08:30:00Z",
    resolvedAt: null,
    updates: [
      {
        status: "investigating",
        message:
          "We are receiving reports of delayed fiat settlements for Naira payouts. Our team is investigating the issue with our anchor partner.",
        timestamp: "2026-07-22T08:30:00Z",
      },
      {
        status: "identified",
        message:
          "The issue has been identified as a connectivity problem with the SEP-24 anchor. We are working with our partner to restore service.",
        timestamp: "2026-07-22T09:15:00Z",
      },
    ],
  },
  {
    id: "inc_002",
    title: "Dashboard Login — Intermittent 502 Errors",
    status: "resolved",
    affectedComponents: ["dashboard"],
    createdAt: "2026-07-10T14:00:00Z",
    resolvedAt: "2026-07-10T15:20:00Z",
    updates: [
      {
        status: "investigating",
        message:
          "Some merchants are experiencing intermittent 502 errors when logging in to the dashboard.",
        timestamp: "2026-07-10T14:00:00Z",
      },
      {
        status: "identified",
        message:
          "A misconfigured load balancer rule was causing intermittent failures. Fix has been deployed.",
        timestamp: "2026-07-10T14:45:00Z",
      },
      {
        status: "monitoring",
        message:
          "The fix has been deployed and we are monitoring for stability.",
        timestamp: "2026-07-10T15:00:00Z",
      },
      {
        status: "resolved",
        message:
          "The issue has been resolved. All systems are operating normally.",
        timestamp: "2026-07-10T15:20:00Z",
      },
    ],
  },
  {
    id: "inc_003",
    title: "Payment API — Elevated Error Rates",
    status: "resolved",
    affectedComponents: ["api", "payments"],
    createdAt: "2026-06-28T10:00:00Z",
    resolvedAt: "2026-06-28T11:30:00Z",
    updates: [
      {
        status: "investigating",
        message:
          "We are observing elevated error rates on the Payment API endpoints. Some payment requests may fail.",
        timestamp: "2026-06-28T10:00:00Z",
      },
      {
        status: "identified",
        message:
          "A database connection pool exhaustion was causing timeouts. Pool size has been increased.",
        timestamp: "2026-06-28T10:30:00Z",
      },
      {
        status: "resolved",
        message:
          "The issue has been resolved. Error rates have returned to normal levels.",
        timestamp: "2026-06-28T11:30:00Z",
      },
    ],
  },
];

export function getOverallStatus(
  components: StatusComponent[]
): { level: ComponentStatusLevel; label: string } {
  const hasDown = components.some((c) => c.status === "down");
  const hasDegraded = components.some((c) => c.status === "degraded");

  if (hasDown) {
    return { level: "down", label: "Major Outage" };
  }
  if (hasDegraded) {
    return { level: "degraded", label: "Partial Outage" };
  }
  return { level: "operational", label: "All Systems Operational" };
}
