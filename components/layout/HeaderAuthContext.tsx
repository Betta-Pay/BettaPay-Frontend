"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { Role } from '@/lib/types';

export const SESSION_EXPIRY_WARNING_SECONDS = 120;
export const SESSION_EXPIRY_WARNING_MS = SESSION_EXPIRY_WARNING_SECONDS * 1000;
const DEFAULT_REFRESH_EXTENSION_MS = 15 * 60 * 1000;

/**
 * Normalizes a JWT token string or numeric `exp` claim (seconds or milliseconds)
 * into a millisecond epoch timestamp.
 */
export function extractJwtExpirationMs(
  tokenOrExp?: string | number | null
): number | null {
  if (typeof tokenOrExp === 'number' && Number.isFinite(tokenOrExp)) {
    return tokenOrExp < 1e12 ? tokenOrExp * 1000 : tokenOrExp;
  }

  if (typeof tokenOrExp === 'string' && tokenOrExp.trim().length > 0) {
    const parts = tokenOrExp.split('.');
    if (parts.length === 3) {
      try {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(
          base64.length + ((4 - (base64.length % 4)) % 4),
          '='
        );
        const decoded =
          typeof atob === 'function'
            ? atob(padded)
            : Buffer.from(padded, 'base64').toString('utf-8');
        const payload = JSON.parse(decoded) as { exp?: unknown };
        if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
          return payload.exp < 1e12 ? payload.exp * 1000 : payload.exp;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Auth state for the public marketing `Header` (issue #712).
 *
 * Resolved on the server by `app/(marketing)/layout.tsx` from the request
 * cookies, so the very first HTML already contains the right nav links — there
 * is no client-side auth probe and therefore no flash of logged-out links
 * before hydration. Only the facts the Header needs cross the server/client
 * boundary; the session token itself never does.
 */
export interface HeaderAuthState {
  isAuthenticated: boolean;
  role: Role | null;
  /** Optional JWT expiration timestamp (epoch seconds or ms) */
  expiresAt?: number | null;
  /** Optional JWT string whose `exp` claim is inspected on the client */
  token?: string | null;
  /** Optional callback to silently refresh the session without reloading */
  onRefreshSession?: () =>
    | Promise<number | boolean | void>
    | number
    | boolean
    | void;
}

const LOGGED_OUT: HeaderAuthState = { isAuthenticated: false, role: null };

const HeaderAuthContext = createContext<HeaderAuthState>(LOGGED_OUT);

export function HeaderAuthProvider({
  value,
  children,
}: {
  value: HeaderAuthState;
  children: React.ReactNode;
}) {
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(() =>
    extractJwtExpirationMs(value.expiresAt ?? value.token ?? null)
  );
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setExpiresAtMs(
      extractJwtExpirationMs(value.expiresAt ?? value.token ?? null)
    );
    setShowWarning(false);
  }, [value.expiresAt, value.token, value.isAuthenticated]);

  useEffect(() => {
    if (!value.isAuthenticated || expiresAtMs === null) {
      setShowWarning(false);
      return;
    }

    const warningTimeMs = expiresAtMs - SESSION_EXPIRY_WARNING_MS;
    const delayMs = warningTimeMs - Date.now();

    if (delayMs <= 0) {
      setShowWarning(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowWarning(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value.isAuthenticated, expiresAtMs]);

  const handleStayLoggedIn = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let nextExpiry: number | null = null;
      if (value.onRefreshSession) {
        const result = await value.onRefreshSession();
        if (typeof result === 'number') {
          nextExpiry = extractJwtExpirationMs(result);
        }
      } else if (typeof fetch === 'function') {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (response && response.ok) {
            const data = (await response.json().catch(() => null)) as {
              expiresAt?: number;
              token?: string;
            } | null;
            nextExpiry = extractJwtExpirationMs(
              data?.expiresAt ?? data?.token ?? null
            );
          }
        } catch {
          // Ignore network errors in standalone layouts and extend locally
        }
      }

      setExpiresAtMs(nextExpiry ?? Date.now() + DEFAULT_REFRESH_EXTENSION_MS);
      setShowWarning(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [value]);

  return (
    <HeaderAuthContext.Provider value={value}>
      {children}
      {showWarning && value.isAuthenticated && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-expiry-warning-title"
          data-testid="session-expiry-warning-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
            <h2
              id="session-expiry-warning-title"
              className="text-lg font-semibold text-foreground"
            >
              Session Expiring Soon
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your session will expire in less than 2 minutes. Click Stay Logged
              In to refresh your session without losing your progress.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Dismiss
              </button>
              <button
                type="button"
                data-testid="stay-logged-in-btn"
                disabled={isRefreshing}
                onClick={handleStayLoggedIn}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Stay Logged In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </HeaderAuthContext.Provider>
  );
}

/** Falls back to logged-out when rendered outside the marketing layout. */
export function useHeaderAuth(): HeaderAuthState {
  return useContext(HeaderAuthContext);
}
