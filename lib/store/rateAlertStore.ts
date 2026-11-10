import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { z } from 'zod';
import { csrfHeader } from '@/lib/utils/csrf';

const MAX_ALERTS = 100;
export const RATE_ALERT_STORAGE_KEY = 'bettapay_rate_alerts';
export const RATE_ALERT_STORAGE_VERSION = 1;

export type RateAlertRecurrence = 'once' | 'recurring';
export type RateAlertChannel = 'in_app' | 'email' | 'webhook';

export interface RateAlertWindow {
  /** 24h "HH:MM" — alerts only fire inside [start, end]. Omitted = always. */
  start: string;
  end: string;
}

export interface RateAlert {
  id: string;
  pair: string;
  condition: 'above' | 'below';
  target: number;
  enabled: boolean;
  /** #469: one-time alerts deactivate after firing; recurring re-arm. */
  recurrence: RateAlertRecurrence;
  channels: RateAlertChannel[];
  window?: RateAlertWindow;
  triggered?: boolean;
  triggeredAt?: number;
  /** #469: server dedupe marker — last time any channel delivered. */
  lastDeliveredAt?: number;
  /** Set once the row is known to the backend (issue #469). */
  synced?: boolean;
}

export const rateAlertWindowSchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});

export const rateAlertSchema = z.object({
  id: z.string().min(1),
  pair: z.string().min(1),
  condition: z.enum(['above', 'below']),
  target: z.number().finite().positive(),
  enabled: z.boolean(),
  recurrence: z.enum(['once', 'recurring']).default('once'),
  channels: z.array(z.enum(['in_app', 'email', 'webhook'])).default(['in_app']),
  window: rateAlertWindowSchema.optional(),
  triggered: z.boolean().optional(),
  triggeredAt: z.number().finite().optional(),
  lastDeliveredAt: z.number().finite().optional(),
  synced: z.boolean().optional(),
});

export const persistedRateAlertStateSchema = z.object({
  alerts: z.array(rateAlertSchema),
});

export interface PersistedRateAlertSlice {
  alerts: RateAlert[];
}

/**
 * Validate and filter an arbitrary candidate list of alerts against `rateAlertSchema`.
 * Invalid records are discarded rather than crashing hydration.
 */
export function sanitizeRateAlerts(rawAlerts: unknown): RateAlert[] {
  if (!Array.isArray(rawAlerts)) return [];
  const valid: RateAlert[] = [];
  for (const candidate of rawAlerts) {
    const parsed = rateAlertSchema.safeParse(candidate);
    if (parsed.success) {
      valid.push(parsed.data);
    }
  }
  return valid.slice(-MAX_ALERTS);
}

/**
 * Safely parse and schema-validate raw JSON from `localStorage`.
 * Returns a clean empty state if the JSON is malformed or schema-invalid.
 */
export function parsePersistedRateAlertStorage(
  raw: string | null,
): StorageValue<PersistedRateAlertSlice> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { state: { alerts: [] }, version: RATE_ALERT_STORAGE_VERSION };
    }
    const record = parsed as Record<string, unknown>;
    const rawVersion =
      typeof record.version === 'number' && Number.isFinite(record.version)
        ? record.version
        : 0;
    const stateObj =
      record.state && typeof record.state === 'object'
        ? (record.state as Record<string, unknown>)
        : record;

    const strictResult = persistedRateAlertStateSchema.safeParse(stateObj);
    if (strictResult.success) {
      return {
        state: { alerts: strictResult.data.alerts.slice(-MAX_ALERTS) },
        version: rawVersion,
      };
    }

    return {
      state: { alerts: sanitizeRateAlerts(stateObj.alerts) },
      version: rawVersion,
    };
  } catch {
    return { state: { alerts: [] }, version: RATE_ALERT_STORAGE_VERSION };
  }
}

const rateAlertPersistStorage: PersistStorage<PersistedRateAlertSlice> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(name);
      const parsed = parsePersistedRateAlertStorage(raw);
      if (raw !== null && parsed && parsed.state.alerts.length === 0) {
        // Persist the sanitized fallback if the raw payload was corrupted
        window.localStorage.setItem(
          name,
          JSON.stringify({ state: { alerts: [] }, version: RATE_ALERT_STORAGE_VERSION }),
        );
      }
      return parsed;
    } catch {
      return { state: { alerts: [] }, version: RATE_ALERT_STORAGE_VERSION };
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      const validatedAlerts = sanitizeRateAlerts(value.state?.alerts);
      window.localStorage.setItem(
        name,
        JSON.stringify({
          state: { alerts: validatedAlerts },
          version: value.version ?? RATE_ALERT_STORAGE_VERSION,
        }),
      );
    } catch {
      // Ignore quota or storage security errors
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

type NewAlert = Pick<RateAlert, 'pair' | 'condition' | 'target'> &
  Partial<Pick<RateAlert, 'recurrence' | 'channels' | 'window'>>;

interface RateAlertState {
  alerts: RateAlert[];
  /** true once the initial server reconcile has completed. */
  hydratedFromServer: boolean;
  addAlert: (alert: NewAlert) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  markAlertTriggered: (id: string) => void;
  resetAlertTrigger: (id: string) => void;
  clearAllAlerts: () => void;
  /** Replace local alerts with the authoritative server list (issue #469). */
  reconcile: (serverAlerts: RateAlert[]) => void;
  /** Fetch `/api/rate-alerts` and reconcile. Safe to call on every boot. */
  hydrateFromServer: () => Promise<void>;
  /** Ask the server to evaluate `pair` at `rate`: it fires + delivers +
   *  dedupes, then we reconcile from its authoritative list (issue #469). */
  evaluate: (pair: string, rate: number) => Promise<void>;
}

function localId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/** Same-origin JSON fetch to our Next API routes, with the CSRF header. */
async function api(
  path: string,
  init?: { method?: string; body?: string },
): Promise<Response> {
  return fetch(path, {
    method: init?.method ?? 'GET',
    body: init?.body,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader(),
    },
  });
}

export const useRateAlertStore = create<RateAlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      hydratedFromServer: false,
      addAlert: (alert) => {
        // Optimistic local insert so the UI (and the sync store tests) see the
        // row immediately; then push to the server and swap in the real id.
        const tempId = localId();
        const optimistic: RateAlert = {
          pair: alert.pair,
          condition: alert.condition,
          target: alert.target,
          recurrence: alert.recurrence ?? 'once',
          channels: alert.channels ?? ['in_app'],
          window: alert.window,
          id: tempId,
          enabled: true,
          triggered: false,
          synced: false,
        };
        set((state) => {
          const nextAlerts = [...state.alerts, optimistic];
          return { alerts: nextAlerts.slice(-MAX_ALERTS) };
        });

        void api('/api/rate-alerts', {
          method: 'POST',
          body: JSON.stringify({
            pair: optimistic.pair,
            condition: optimistic.condition,
            target: optimistic.target,
            recurrence: optimistic.recurrence,
            channels: optimistic.channels,
            window: optimistic.window,
          }),
        })
          .then(async (res) => {
            if (!res.ok) return;
            const body = (await res.json().catch(() => ({}))) as { alert?: RateAlert };
            if (!body.alert) return;
            set((state) => ({
              alerts: state.alerts.map((a) =>
                a.id === tempId ? { ...body.alert!, synced: true } : a,
              ),
            }));
          })
          .catch(() => {
            /* offline — keep the local row, retry on next hydrate */
          });
      },
      toggleAlert: (id) => {
        const current = get().alerts.find((a) => a.id === id);
        const nextEnabled = !(current?.enabled ?? true);
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id
              ? { ...a, enabled: nextEnabled, triggered: nextEnabled ? false : a.triggered }
              : a,
          ),
        }));
        if (current?.synced) {
          void api(`/api/rate-alerts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              enabled: nextEnabled,
              ...(nextEnabled ? {} : { triggered: false }),
            }),
          }).catch(() => {});
        }
      },
      deleteAlert: (id) => {
        const current = get().alerts.find((a) => a.id === id);
        set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
        if (current?.synced) {
          void api(`/api/rate-alerts/${id}`, { method: 'DELETE' }).catch(() => {});
        }
      },
      markAlertTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) => {
            if (a.id !== id) return a;
            const fired = { ...a, triggered: true, triggeredAt: Date.now() };
            // One-time alerts deactivate after firing (issue #469 acceptance).
            return a.recurrence === 'once' ? { ...fired, enabled: false } : fired;
          }),
        })),
      resetAlertTrigger: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id
              ? { ...a, triggered: false, triggeredAt: undefined, lastDeliveredAt: undefined }
              : a,
          ),
        })),
      clearAllAlerts: () => set({ alerts: [] }),
      reconcile: (serverAlerts) => {
        // Server is authoritative; keep any local-only rows that haven't been
        // pushed yet so an offline "add" isn't lost on the next boot.
        const serverIds = new Set(serverAlerts.map((a) => a.id));
        const localOnly = get().alerts.filter((a) => a.synced === false && !serverIds.has(a.id));
        set({
          alerts: [...serverAlerts.map((a) => ({ ...a, synced: true })), ...localOnly],
          hydratedFromServer: true,
        });
      },
      hydrateFromServer: async () => {
        try {
          const res = await api('/api/rate-alerts', { method: 'GET' });
          if (!res.ok) return;
          const body = (await res.json().catch(() => ({}))) as { alerts?: RateAlert[] };
          if (Array.isArray(body.alerts)) get().reconcile(body.alerts);
        } catch {
          // offline — keep the persisted local list; try again next boot
        }
      },
      evaluate: async (pair, rate) => {
        try {
          const res = await api('/api/rate-alerts/evaluate', {
            method: 'POST',
            body: JSON.stringify({ pair, rate }),
          });
          if (!res.ok) return;
          const body = (await res.json().catch(() => ({}))) as { alerts?: RateAlert[] };
          if (Array.isArray(body.alerts)) get().reconcile(body.alerts);
        } catch {
          // offline — fall back to the client-side check in the FX page
        }
      },
    }),
    {
      name: RATE_ALERT_STORAGE_KEY,
      version: RATE_ALERT_STORAGE_VERSION,
      storage: rateAlertPersistStorage,
      partialize: (s) => ({ alerts: s.alerts }),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return { alerts: [] };
        }
        const record = persistedState as Record<string, unknown>;
        return { alerts: sanitizeRateAlerts(record.alerts) };
      },
      merge: (persistedState, currentState) => {
        const record =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Record<string, unknown>)
            : {};
        return {
          ...currentState,
          alerts: sanitizeRateAlerts(record.alerts),
        };
      },
    },
  ),
);
