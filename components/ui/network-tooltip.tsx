'use client';

import { ReactNode, useEffect, useState, useCallback } from 'react';
import { getRpcUrl, type StellarNetwork } from '@/lib/stellar/config';
import { cn } from '@/lib/utils';

export const LATENCY_WARNING_THRESHOLD_MS = 1500;

export async function pingSorobanRpc(
  rpcUrl: string = getRpcUrl('testnet')
): Promise<number | null> {
  if (typeof fetch === 'undefined') return null;
  const now =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();

  const start = now();
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
    });
    if (!response || !response.ok) {
      return null;
    }
    const elapsed = Math.max(0, Math.round(now() - start));
    return elapsed;
  } catch {
    return null;
  }
}

export interface NetworkTooltipProps {
  children: ReactNode;
  /** Whether to show the tooltip (i.e. when the action is disabled due to offline or network status) */
  show?: boolean;
  message?: string;
  /**
   * Optional id for the inner tooltip element so it can be targeted by
   * `aria-describedby` on the wrapped child for screen-reader users.
   */
  id?: string;
  /** Stellar network identifier used to resolve the Soroban RPC URL */
  network?: StellarNetwork | string;
  /** Explicit Soroban RPC URL override for `getHealth` ping */
  rpcUrl?: string;
  /** Optional explicit latency in milliseconds (overrides live RPC ping when provided) */
  latencyMs?: number | null;
  /** Whether to proactively ping Soroban RPC on mount (automatically true when `network` or `rpcUrl` is specified) */
  showLatency?: boolean;
  /** Heartbeat interval in ms (defaults to 30000; set 0 to disable periodic polling) */
  pingIntervalMs?: number;
}

export function NetworkTooltip({
  children,
  show = true,
  message = 'Internet connection required',
  id,
  network,
  rpcUrl,
  latencyMs: providedLatencyMs,
  showLatency,
  pingIntervalMs = 30000,
}: NetworkTooltipProps) {
  const [measuredLatencyMs, setMeasuredLatencyMs] = useState<number | null>(
    providedLatencyMs ?? null
  );

  const targetRpcUrl = rpcUrl ?? getRpcUrl(network ?? 'testnet');
  const shouldAutoPing =
    Boolean(showLatency) || network !== undefined || rpcUrl !== undefined;

  const measureLatency = useCallback(async () => {
    const result = await pingSorobanRpc(targetRpcUrl);
    return result;
  }, [targetRpcUrl]);

  const triggerPing = useCallback(() => {
    if (providedLatencyMs !== undefined || !show) return;
    measureLatency().then((ms) => {
      if (ms !== null) {
        setMeasuredLatencyMs(ms);
      }
    });
  }, [providedLatencyMs, show, measureLatency]);

  useEffect(() => {
    if (providedLatencyMs !== undefined) {
      setMeasuredLatencyMs(providedLatencyMs);
      return;
    }
    if (!show || !shouldAutoPing) return;

    let cancelled = false;
    measureLatency().then((ms) => {
      if (!cancelled && ms !== null) {
        setMeasuredLatencyMs(ms);
      }
    });

    if (pingIntervalMs <= 0) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setInterval(() => {
      measureLatency().then((ms) => {
        if (!cancelled && ms !== null) {
          setMeasuredLatencyMs(ms);
        }
      });
    }, pingIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [show, shouldAutoPing, providedLatencyMs, measureLatency, pingIntervalMs]);

  if (!show) return <>{children}</>;

  const effectiveLatencyMs =
    providedLatencyMs !== undefined ? providedLatencyMs : measuredLatencyMs;
  const isHighLatency =
    typeof effectiveLatencyMs === 'number' &&
    effectiveLatencyMs > LATENCY_WARNING_THRESHOLD_MS;

  return (
    <div
      className="relative group/nettooltip inline-block"
      onMouseEnter={triggerPing}
      onFocus={triggerPing}
    >
      {children}
      <div
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/nettooltip:opacity-100 flex items-center gap-2"
      >
        <span>{message}</span>
        {typeof effectiveLatencyMs === 'number' && (
          <span
            data-testid="network-tooltip-latency"
            className={cn(
              'inline-flex items-center gap-1 font-mono text-[11px]',
              isHighLatency ? 'text-amber-500' : 'text-emerald-400'
            )}
          >
            <span
              data-testid="network-tooltip-indicator"
              aria-hidden="true"
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                isHighLatency ? 'bg-amber-500' : 'bg-emerald-500'
              )}
            />
            {effectiveLatencyMs} ms
          </span>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
