/**
 * Server-side health probe functions.
 *
 * Each checker is a standalone async function that resolves to a
 * ServiceHealth object. They are intentionally isolated so they can be
 * tested or replaced independently.
 *
 * Security: error messages passed to the UI are sanitised here — raw
 * exceptions (which may contain URLs, tokens, or stack traces) are
 * never forwarded to the client.
 */

import type { ServiceHealth } from "@/lib/types/health";
import type { AnchorHealth, AnchorHealthStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Measure round-trip time for an arbitrary async probe. */
async function timed<T>(
  fn: () => Promise<T>
): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

/** Return a safe, non-leaking error string. */
function safeError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    // Only forward the message, never the stack. Additionally strip anything
    // that looks like a URL with credentials.
    const msg = err.message.replace(/https?:\/\/[^\s]*/g, "[url]");
    // Truncate to keep payloads small and avoid verbose internal paths.
    return msg.slice(0, 200) || fallback;
  }
  return fallback;
}

const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Horizon API
// ---------------------------------------------------------------------------

export async function checkHorizon(): Promise<ServiceHealth> {
  const endpoint = HORIZON_URL;

  try {
    const { latencyMs } = await timed(() =>
      fetch(`${endpoint}/`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      })
    );

    const status = latencyMs > 2_000 ? "degraded" : "healthy";

    return {
      service: "horizon",
      label: "Horizon API",
      status,
      latencyMs,
      checkedAt: now(),
      meta: { endpoint },
    };
  } catch (err) {
    return {
      service: "horizon",
      label: "Horizon API",
      status: "unhealthy",
      checkedAt: now(),
      errorMessage: safeError(err, "Horizon API is unreachable"),
    };
  }
}

// ---------------------------------------------------------------------------
// Soroban RPC
// ---------------------------------------------------------------------------

export async function checkSoroban(): Promise<ServiceHealth> {
export async function checkSoroban(): Promise<ServiceHealth> {
  const endpoint = SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

  try {
    const { latencyMs } = await timed(() =>
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
          params: [],
        }),
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    );

    const status = latencyMs > 2_000 ? "degraded" : "healthy";

    return {
      service: "soroban",
      label: "Soroban RPC",
      status,
      latencyMs,
      checkedAt: now(),
    };
  } catch (err) {
    return {
      service: "soroban",
      label: "Soroban RPC",
      status: "unhealthy",
      checkedAt: now(),
      errorMessage: safeError(err, "Soroban RPC is unreachable"),
    };
  }
}

// ---------------------------------------------------------------------------
// SEP-24 Anchor
// ---------------------------------------------------------------------------

export async function checkSep24(): Promise<ServiceHealth> {
  const endpoint = ANCHOR_URL;

  try {
    const { latencyMs } = await timed(() =>
      fetch(`${endpoint}/.well-known/stellar.toml`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      })
    );

    const status = latencyMs > 3_000 ? "degraded" : "healthy";

    return {
      service: "sep24",
      label: "SEP-24 Anchor",
      status,
      latencyMs,
      checkedAt: now(),
    };
  } catch (err) {
    return {
      service: "sep24",
      label: "SEP-24 Anchor",
      status: "unhealthy",
      checkedAt: now(),
      errorMessage: safeError(err, "SEP-24 Anchor is unreachable"),
    };
  }
}

// ---------------------------------------------------------------------------
// Per-anchor SEP-24 probe
// ---------------------------------------------------------------------------

export async function checkSep24Anchor(
  anchorId: string,
  endpoint: string
): Promise<AnchorHealth> {
  try {
    const { latencyMs } = await timed(() =>
      fetch(`${endpoint}/.well-known/stellar.toml`, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r;
      })
    );

    const status: AnchorHealthStatus = latencyMs > 3_000 ? "degraded" : "healthy";

    return {
      anchorId,
      status,
      latencyMs,
      checkedAt: now(),
    };
  } catch (err) {
    return {
      anchorId,
      status: "unreachable",
      latencyMs: null,
      checkedAt: now(),
      errorMessage: safeError(err, "Anchor SEP-24 endpoint unreachable"),
    };
  }
}

// ---------------------------------------------------------------------------
// PostgreSQL (via a lightweight ping route on the backend, or direct pg)
// ---------------------------------------------------------------------------

export async function checkPostgres(): Promise<ServiceHealth> {
  // In production this would call an internal /healthz endpoint that runs
  // SELECT 1 against the real DB. Here we call the backend's health endpoint
  // (or fallback to the same-origin ping route we expose ourselves).
  const endpoint =
    process.env.BACKEND_HEALTH_URL ||
    API_URL ||
    "";

  if (!endpoint) {
    // No backend configured — report as degraded (not unhealthy) so the
    // admin can see the configuration gap without a hard red.
    return {
      service: "postgres",
      label: "PostgreSQL",
      status: "degraded",
      checkedAt: now(),
      errorMessage: "Backend health endpoint not configured",
    };
  }

  try {
    const { latencyMs } = await timed(() =>
      fetch(`${endpoint}/healthz`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
        cache: "no-store",
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
    );

    const status = latencyMs > 1_500 ? "degraded" : "healthy";

    return {
      service: "postgres",
      label: "PostgreSQL",
      status,
      latencyMs,
      checkedAt: now(),
    };
  } catch (err) {
    return {
      service: "postgres",
      label: "PostgreSQL",
      status: "unhealthy",
      checkedAt: now(),
      errorMessage: safeError(err, "Database is unreachable"),
    };
  }
}
