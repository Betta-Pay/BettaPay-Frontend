/**
 * BettaPay service worker — generated from this template by
 * `scripts/build-sw.mjs` (workbox-build `injectManifest`). Do not edit
 * `public/sw.js` directly; it is produced from this file.
 *
 * Responsibilities:
 *  1. Precache the app shell (Next.js JS/CSS/fonts plus static icons) so the
 *     merchant dashboard renders offline after the first visit.
 *  2. Serve navigations network-first with a cached-shell fallback (per-URL,
 *     then the home page) so every route survives a reload while offline.
 *  3. Runtime-cache GET API list/detail responses stale-while-revalidate so
 *     list pages render from the last successful response offline.
 *  4. Background-sync offline-created payment links and webhook test
 *     submissions, which the client queues into IndexedDB
 *     (`lib/offline/syncQueue.ts` uses the same store).
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

const API_CACHE = 'bettapay-api-v1';
const SHELL_CACHE = 'bettapay-shell-v1';
const QUEUE_DB = 'bettapay-offline';
const QUEUE_STORE = 'sync-queue';
const SYNC_TAG = 'bettapay-sync';
const MAX_ATTEMPTS = 5;

// Baked in at build time by `scripts/build-sw.mjs`. Same-origin `/api/*`
// requests are always treated as API requests; this covers cross-origin
// backends (NEXT_PUBLIC_API_URL).
const API_ORIGIN = new URL(__API_ORIGIN_JSON__, self.location).origin;

// ─── Precache the app shell ────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ─── Lifecycle ──────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'SYNC_NOW':
      event.waitUntil(drainQueue());
      break;
    case 'CLEAR_API_CACHE':
      // Called on logout so a different account can never be shown stale
      // session/payment data served from the offline API cache.
      event.waitUntil(caches.delete(API_CACHE));
      break;
    default:
      break;
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Catch up on anything queued while the previous worker was active.
      await drainQueue();
    })(),
  );
});

// Native Background Sync — fires when the browser believes connectivity has
// returned. Fallbacks: the SYNC_NOW message above and the `online` event below.
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(drainQueue());
  }
});

self.addEventListener('online', () => {
  void drainQueue();
});

// ─── Navigations: network-first, cached-shell fallback ─────────────────────
registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event }) => {
    const cache = await caches.open(SHELL_CACHE);
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        // Cache the HTML for this exact URL so the next offline visit to the
        // same route renders immediately.
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      // Fall back to the cached home-page shell (identical app shell markup
      // for every route; client-side routing hydrates the right page).
      const home = await cache.match(new Request(self.location.origin + '/'));
      if (home) return home;
      throw error;
    }
  },
);

// ─── API GETs: stale-while-revalidate ───────────────────────────────────────
function isApiRequest({ url }) {
  if (url.origin === self.location.origin) {
    return url.pathname.startsWith('/api/');
  }
  return url.origin === API_ORIGIN;
}

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    // The health probe must always hit the network so the offline banner
    // reflects real API reachability rather than a cached 200.
    !url.pathname.endsWith('/healthz') &&
    isApiRequest({ url }),
  new StaleWhileRevalidate({
    cacheName: API_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
);

// ─── Payment-link creation: background sync on network failure ──────────────
// Safety net for requests that reach the network and fail (flaky connection,
// server blip). The primary offline path queues the request from the client
// (see lib/offline/syncQueue.ts) before it ever reaches the network.
registerRoute(
  ({ url, request }) =>
    request.method === 'POST' &&
    url.pathname.endsWith('/api/payment-links') &&
    (url.origin === self.location.origin || url.origin === API_ORIGIN),
  new NetworkOnly({
    plugins: [new BackgroundSyncPlugin('bettapay-payment-link-sync')],
  }),
);

// ─── Offline queue: payment links + webhook tests created while offline ─────
function openQueueDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllQueued(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const request = tx.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function updateQueued(db, record) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteQueued(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function postToClients(message) {
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      for (const client of clients) {
        client.postMessage(message);
      }
    })
    .catch(() => {
      // No clients to notify — nothing to do.
    });
}

// Drop SWR-cached GET responses for a given API path (e.g. the payments list)
// so the next request fetches fresh — otherwise a just-synced payment link
// stays hidden because StaleWhileRevalidate would keep serving the stale list.
async function evictApiPath(pathnameContains) {
  try {
    const cache = await caches.open(API_CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter((r) => {
          try {
            return new URL(r.url).pathname.includes(pathnameContains);
          } catch {
            return false;
          }
        })
        .map((r) => cache.delete(r)),
    );
  } catch {
    // Cache unavailable — revalidation will catch up on the next request.
  }
}

/**
 * Replay every queued request. A 2xx or a permanent 4xx means the server saw
 * the request — drop the entry and tell the page. Network errors, 5xx, 401 and
 * 429 are retried on the next sync (up to MAX_ATTEMPTS) so a temporarily
 * unreachable API never loses a payment link.
 */
async function drainOnce() {
  let db;
  try {
    db = await openQueueDb();
  } catch {
    return;
  }
  try {
    const records = await getAllQueued(db);
    for (const record of records) {
      const headers = new Headers();
      for (const [key, value] of record.headers || []) {
        headers.append(key, value);
      }

      const request = new Request(record.url, {
        method: record.method || 'POST',
        headers,
        body: record.body ?? undefined,
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
      });

      let response = null;
      try {
        response = await fetch(request);
      } catch {
        response = null;
      }

      const permanentFailure =
        response &&
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 401 &&
        response.status !== 429;

      if ((response && response.ok) || permanentFailure || record.attempts >= MAX_ATTEMPTS) {
        await deleteQueued(db, record.id);
        // A replayed payment link is server-side; the page refetches on
        // SYNC_COMPLETE, so clear the stale list to make it appear immediately.
        if (record.tag === 'payment-link' && response && response.ok) {
          await evictApiPath('/api/payments');
        }
        postToClients({
          type: 'SYNC_COMPLETE',
          id: record.id,
          tag: record.tag,
          ok: Boolean(response && response.ok),
        });
      } else {
        await updateQueued(db, { ...record, attempts: (record.attempts || 0) + 1 });
      }
    }
  } catch {
    // Best-effort drain; anything still queued is retried on the next sync.
  } finally {
    db.close();
  }
}

// Serialize drains so a sync event racing with an activate/message drain can
// never replay (and duplicate) the same queued request twice.
let draining = null;
function drainQueue() {
  if (!draining) {
    draining = drainOnce().finally(() => {
      draining = null;
    });
  }
  return draining;
}
