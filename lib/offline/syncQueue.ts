/**
 * Client side of the offline mutation queue shared with the service worker.
 *
 * When the merchant dashboard is offline, state-changing actions (payment-link
 * creation, webhook test submissions) are queued here instead of failing. The
 * service worker drains the same IndexedDB store when connectivity returns —
 * via the native `sync` event, a `SYNC_NOW` message, or the SW `online` event —
 * and broadcasts `SYNC_COMPLETE` messages back so pages can refresh their data.
 *
 * The store schema must stay in sync with `scripts/sw-template.js`.
 */

export const SYNC_TAGS = {
  paymentLink: 'payment-link',
  webhookTest: 'webhook-test',
} as const;

export type SyncTag = (typeof SYNC_TAGS)[keyof typeof SYNC_TAGS];

export interface QueuedSyncRequest {
  id: string;
  tag: SyncTag;
  url: string;
  method: string;
  headers: Array<[string, string]>;
  body: string | null;
  createdAt: number;
  attempts: number;
}

export interface SyncCompleteMessage {
  type: 'SYNC_COMPLETE';
  id: string;
  tag: SyncTag;
  ok: boolean;
}

const DB_NAME = 'bettapay-offline';
const STORE_NAME = 'sync-queue';
const SYNC_TAG = 'bettapay-sync';

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(db: IDBDatabase, record: QueuedSyncRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function countRecords(db: IDBDatabase, tag?: SyncTag): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = tag ? store.getAll() : store.count();
    request.onsuccess = () => {
      if (tag) {
        const records = request.result as QueuedSyncRequest[];
        resolve(records.filter((record) => record.tag === tag).length);
      } else {
        resolve(request.result as number);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export interface EnqueueSyncOptions {
  tag: SyncTag;
  url: string;
  method?: string;
  headers?: Array<[string, string]>;
  body?: string | null;
}

/**
 * Queue a request for replay once connectivity returns. Returns the queue id
 * so callers can correlate later `SYNC_COMPLETE` messages with their UI.
 *
 * Best-effort: if IndexedDB or the service worker is unavailable (e.g. dev
 * mode), the record is dropped and the returned id simply never completes.
 */
export async function enqueueSyncRequest(options: EnqueueSyncOptions): Promise<string> {
  const id = `${options.tag}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const record: QueuedSyncRequest = {
    id,
    tag: options.tag,
    url: options.url,
    method: options.method ?? 'POST',
    headers: options.headers ?? [],
    body: options.body ?? null,
    createdAt: Date.now(),
    attempts: 0,
  };

  try {
    const db = await openQueueDb();
    try {
      await putRecord(db, record);
    } finally {
      db.close();
    }
  } catch {
    // Storage unavailable — the request cannot be persisted. Callers still
    // receive the id and can surface their own messaging.
  }

  await triggerSync();
  return id;
}

/**
 * Ask the service worker to replay the queue now. Safe to call repeatedly and
 * in environments without a service worker (resolves immediately).
 */
export async function triggerSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    // `'sync' in registration` narrows the property to `unknown`; cast to the
    // SyncManager shape guarded at runtime.
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    }).sync;
    if (syncManager) {
      try {
        await syncManager.register(SYNC_TAG);
      } catch {
        // SyncManager unavailable — the SW message / online event still drain.
      }
    }
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
    }
  } catch {
    // No service worker — nothing to trigger.
  }
}

/** Number of requests currently waiting to sync (optionally per tag). */
export async function getPendingSyncCount(tag?: SyncTag): Promise<number> {
  try {
    const db = await openQueueDb();
    try {
      return await countRecords(db, tag);
    } finally {
      db.close();
    }
  } catch {
    return 0;
  }
}

/**
 * Subscribe to `SYNC_COMPLETE` messages broadcast by the service worker after
 * a queued request has been replayed. Returns an unsubscribe function.
 */
export function watchSyncComplete(callback: (message: SyncCompleteMessage) => void): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    const data = event.data as SyncCompleteMessage | undefined;
    if (data && data.type === 'SYNC_COMPLETE') {
      callback(data);
    }
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
