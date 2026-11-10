import { create } from 'zustand';

export const OFFLINE_QUEUE_DB_NAME = 'bettapay_offline_db';
export const OFFLINE_QUEUE_STORE_NAME = 'pending_mutations';
export const OFFLINE_QUEUE_STORAGE_KEY = 'bettapay_offline_mutations_queue';

export type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedMutation {
  id: string;
  url: string;
  method: MutationMethod;
  body?: unknown;
  headers?: Record<string, string>;
  createdAt: number;
  retries?: number;
}

export type NewQueuedMutation = Omit<QueuedMutation, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: number;
};

export type MutationExecutor = (mutation: QueuedMutation) => Promise<unknown>;

export interface OfflineState {
  isOnline: boolean;
  isApiReachable: boolean;
  dismissed: boolean;
  pendingMutations: QueuedMutation[];
  isReplaying: boolean;
  setIsOnline: (isOnline: boolean) => void;
  setIsApiReachable: (isApiReachable: boolean) => void;
  dismiss: () => void;
  enqueueMutation: (mutation: NewQueuedMutation) => QueuedMutation;
  removeMutation: (id: string) => void;
  clearMutations: () => void;
  hydrateQueue: () => Promise<QueuedMutation[]>;
  replayQueuedMutations: (
    executor?: MutationExecutor,
  ) => Promise<{ replayed: number; remaining: number }>;
  setMutationExecutor: (executor: MutationExecutor | null) => void;
}

function generateMutationId(): string {
  return `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(OFFLINE_QUEUE_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE_NAME)) {
          db.createObjectStore(OFFLINE_QUEUE_STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readLocalQueue(): QueuedMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedMutation =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as QueuedMutation).id === 'string' &&
            typeof (item as QueuedMutation).url === 'string' &&
            typeof (item as QueuedMutation).method === 'string',
        ),
    );
  } catch {
    return [];
  }
}

function writeLocalQueue(queue: QueuedMutation[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota or security errors
  }
}

async function syncQueueToIndexedDb(queue: QueuedMutation[]): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(OFFLINE_QUEUE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OFFLINE_QUEUE_STORE_NAME);
      store.clear();
      for (const item of queue) {
        store.put(item);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function readQueueFromIndexedDb(): Promise<QueuedMutation[] | null> {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(OFFLINE_QUEUE_STORE_NAME, 'readonly');
      const store = tx.objectStore(OFFLINE_QUEUE_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as QueuedMutation[]) : [];
        rows.sort((a, b) => a.createdAt - b.createdAt);
        db.close();
        resolve(rows);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

function persistQueue(queue: QueuedMutation[]): void {
  writeLocalQueue(queue);
  void syncQueueToIndexedDb(queue);
}

const defaultMutationExecutor: MutationExecutor = async (mutation) => {
  const res = await fetch(mutation.url, {
    method: mutation.method,
    headers: {
      'Content-Type': 'application/json',
      ...(mutation.headers ?? {}),
    },
    body:
      mutation.body !== undefined
        ? typeof mutation.body === 'string'
          ? mutation.body
          : JSON.stringify(mutation.body)
        : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error(`Offline replay failed with status ${res.status}`);
  }
  return res;
};

let customExecutor: MutationExecutor | null = null;

export const useOfflineStore = create<OfflineState>()((set, get) => ({
  isOnline: true,
  isApiReachable: true,
  dismissed: false,
  pendingMutations: readLocalQueue(),
  isReplaying: false,
  setIsOnline: (isOnline) => {
    const wasOffline = !get().isOnline;
    set((state) => {
      // Reset the dismissal whenever connectivity transitions from online to
      // offline so a previously-dismissed banner reappears on the next offline
      // event instead of staying hidden forever.
      if (!isOnline && state.isOnline) {
        return { isOnline, dismissed: false };
      }
      return { isOnline };
    });
    if (isOnline && (wasOffline || get().pendingMutations.length > 0)) {
      void get().replayQueuedMutations();
    }
  },
  setIsApiReachable: (isApiReachable) =>
    set((state) => {
      // Reset dismissal if API goes from reachable to unreachable
      if (!isApiReachable && state.isApiReachable) {
        return { isApiReachable, dismissed: false };
      }
      return { isApiReachable };
    }),
  dismiss: () => set({ dismissed: true }),
  enqueueMutation: (mutation) => {
    const entry: QueuedMutation = {
      id: mutation.id ?? generateMutationId(),
      url: mutation.url,
      method: mutation.method,
      body: mutation.body,
      headers: mutation.headers,
      createdAt: mutation.createdAt ?? Date.now(),
      retries: mutation.retries ?? 0,
    };
    set((state) => {
      const next = [...state.pendingMutations, entry];
      persistQueue(next);
      return { pendingMutations: next };
    });
    return entry;
  },
  removeMutation: (id) =>
    set((state) => {
      const next = state.pendingMutations.filter((m) => m.id !== id);
      persistQueue(next);
      return { pendingMutations: next };
    }),
  clearMutations: () => {
    persistQueue([]);
    set({ pendingMutations: [] });
  },
  hydrateQueue: async () => {
    const idbQueue = await readQueueFromIndexedDb();
    const localQueue = readLocalQueue();
    const chosen = idbQueue && idbQueue.length > 0 ? idbQueue : localQueue;
    set({ pendingMutations: chosen });
    return chosen;
  },
  setMutationExecutor: (executor) => {
    customExecutor = executor;
  },
  replayQueuedMutations: async (executorOverride) => {
    const state = get();
    if (state.isReplaying || state.pendingMutations.length === 0) {
      return { replayed: 0, remaining: state.pendingMutations.length };
    }

    set({ isReplaying: true });
    const run = executorOverride ?? customExecutor ?? defaultMutationExecutor;
    let replayed = 0;

    try {
      const snapshot = [...get().pendingMutations];
      for (const item of snapshot) {
        try {
          await run(item);
          replayed += 1;
          set((curr) => {
            const next = curr.pendingMutations.filter((m) => m.id !== item.id);
            persistQueue(next);
            return { pendingMutations: next };
          });
        } catch {
          // Stop sequential replay on first failure so dependent operations stay ordered
          set((curr) => {
            const next = curr.pendingMutations.map((m) =>
              m.id === item.id ? { ...m, retries: (m.retries ?? 0) + 1 } : m,
            );
            persistQueue(next);
            return { pendingMutations: next };
          });
          break;
        }
      }
    } finally {
      set({ isReplaying: false });
    }

    return { replayed, remaining: get().pendingMutations.length };
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setIsOnline(true);
  });
}
