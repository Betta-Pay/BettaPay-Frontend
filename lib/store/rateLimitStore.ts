import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** localStorage key holding the shared window. Also the cross-tab storage-event key. */
export const RATE_LIMIT_STORAGE_KEY = 'bp-rate-limit';

/** The parts of a rate-limit window that travel between tabs and survive reload. */
export interface RateLimitWindow {
  /** Timestamp (ms) when the window expires. */
  rateLimitedUntil: number;
  /** Endpoint that was rate-limited, if the response identified one. */
  endpoint: string | null;
  /** Rate limit policy (max requests per window). */
  limit: number | null;
}

interface RateLimitState {
  /** Timestamp (ms) when the rate limit expires, or 0 if not rate-limited */
  rateLimitedUntil: number;
  /** Remaining seconds on the countdown */
  secondsRemaining: number;
  /** Endpoint that was rate-limited */
  endpoint: string | null;
  /** Rate limit policy (max requests per window) */
  limit: number | null;
  /** Set the rate limit window (retryAfter in seconds) */
  setRateLimited: (retryAfterSeconds: number, endpoint?: string | null, limit?: number | null) => void;
  /**
   * Adopt a window observed by another tab. Kept separate from
   * `setRateLimited` so the cross-tab listener can apply an update without the
   * change echoing straight back out to the other tabs.
   */
  applyRemoteWindow: (window: RateLimitWindow | null) => void;
  /** Tick the countdown (call every second) */
  tick: () => void;
  /** Clear rate limit state */
  clearRateLimit: () => void;
}

function secondsUntil(until: number): number {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

/**
 * Fold an incoming window into whatever is already open.
 *
 * Two rules matter here. The window always ends at the later of the two
 * deadlines, so a shorter 429 arriving late cannot cut an existing wait short.
 * And when a second endpoint is limited while another window is still open the
 * result becomes global (`endpoint: null`) — otherwise the newer, narrower
 * scope would quietly free the endpoint that is still being limited.
 */
function mergeWindow(
  current: { rateLimitedUntil: number; endpoint: string | null; limit: number | null },
  incoming: RateLimitWindow
): RateLimitWindow & { secondsRemaining: number } {
  const isOpen = current.rateLimitedUntil > Date.now();
  const rateLimitedUntil = Math.max(
    incoming.rateLimitedUntil,
    isOpen ? current.rateLimitedUntil : 0
  );
  const endpoint =
    isOpen && current.endpoint !== incoming.endpoint ? null : incoming.endpoint;

  return {
    rateLimitedUntil,
    secondsRemaining: secondsUntil(rateLimitedUntil),
    endpoint,
    limit: incoming.limit ?? (isOpen ? current.limit : null),
  };
}

export function createRateLimitStore(
  storage?: { getItem: (name: string) => Promise<string | null> | string | null; setItem: (name: string, value: string) => Promise<void> | void; removeItem: (name: string) => Promise<void> | void }
) {
  return create<RateLimitState>()(
    persist(
      (set, get) => ({
        rateLimitedUntil: 0,
        secondsRemaining: 0,
        endpoint: null,
        limit: null,

        setRateLimited: (retryAfterSeconds: number, endpoint?: string | null, limit?: number | null) => {
          set(mergeWindow(get(), {
            rateLimitedUntil: Date.now() + retryAfterSeconds * 1000,
            endpoint: endpoint ?? null,
            limit: limit ?? null,
          }));
        },

        applyRemoteWindow: (window: RateLimitWindow | null) => {
          if (!window || window.rateLimitedUntil <= Date.now()) {
            set({ rateLimitedUntil: 0, secondsRemaining: 0, endpoint: null, limit: null });
            return;
          }

          // Ignore a remote window that would shorten the local one.
          if (window.rateLimitedUntil <= get().rateLimitedUntil) return;

          set(mergeWindow(get(), window));
        },

        tick: () => {
          const { rateLimitedUntil } = get();
          if (rateLimitedUntil === 0) return;

          const remaining = secondsUntil(rateLimitedUntil);
          if (remaining <= 0) {
            set({ rateLimitedUntil: 0, secondsRemaining: 0, endpoint: null, limit: null });
          } else {
            set({ secondsRemaining: remaining });
          }
        },

        clearRateLimit: () => {
          set({ rateLimitedUntil: 0, secondsRemaining: 0, endpoint: null, limit: null });
        },
      }),
      {
        name: RATE_LIMIT_STORAGE_KEY,
        storage: storage ? {
          getItem: async (name: string) => {
            const val = await storage.getItem(name);
            return val ? JSON.parse(val) : null;
          },
          setItem: async (name: string, value: unknown) => {
            await storage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name: string) => {
            await storage.removeItem(name);
          },
        } : undefined,
        partialize: (state) => ({
          rateLimitedUntil: state.rateLimitedUntil,
          endpoint: state.endpoint,
          limit: state.limit,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;

          if (state.rateLimitedUntil <= Date.now()) {
            state.rateLimitedUntil = 0;
            state.secondsRemaining = 0;
            state.endpoint = null;
            state.limit = null;
            return;
          }

          state.secondsRemaining = secondsUntil(state.rateLimitedUntil);
        },
      }
    )
  );
}

export const useRateLimitStore = createRateLimitStore();

/** Read the current shared window, or null when no window is open. */
export function getRateLimitWindow(): RateLimitWindow | null {
  const { rateLimitedUntil, endpoint, limit } = useRateLimitStore.getState();
  if (rateLimitedUntil <= Date.now()) return null;
  return { rateLimitedUntil, endpoint, limit };
}

/** Strip the query string so `/api/payments?page=2` matches `/api/payments`. */
function toPath(url: string): string {
  return url.split('?')[0];
}

/**
 * Whether a request to `url` should be held back by the current window.
 *
 * Scoped to the rate-limited endpoint when the 429 identified one, so a limit
 * on a single endpoint does not stall unrelated screens. When the endpoint is
 * unknown the window is treated as global.
 */
export function isRequestRateLimited(url: string | undefined): boolean {
  const window = getRateLimitWindow();
  if (!window) return false;
  if (!window.endpoint) return true;

  return toPath(url || '') === toPath(window.endpoint);
}
