/**
 * End-to-end verification of the offline merchant dashboard.
 *
 * Proves the acceptance criteria:
 *  1. After first load, the dashboard renders offline with cached data and the
 *     offline banner.
 *  2. An offline-created payment link is queued, then replayed (background
 *     sync) the moment connectivity returns.
 *  3. API-reachability drives the banner (healthz is never served from cache).
 *
 * The API is mocked same-origin (via context.route, exactly like the e2e
 * suite) because the production CSP only allows `connect-src 'self' https:`.
 *
 * Usage:
 *   NEXT_PUBLIC_API_URL=http://localhost:3299 npm run build
 *   npm run verify:offline
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Port 3000 on purpose: app/api/auth/session/route.ts treats an upstream URL
// on localhost:3000 as a self-loop (mock mode) and skips the upstream call —
// any other port would make it call itself and hang.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3000;
const BASE = `http://localhost:${PORT}`;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '  ✅' : '  ❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const corsHeaders = (origin) => ({
  'access-control-allow-origin': origin || '*',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type,Authorization,X-CSRF-Token,x-csrf-token',
});

// ─── Main ────────────────────────────────────────────────────────────────────
// detached so the whole process group (npx → next → next-server) can be
// killed cleanly when the script finishes.
const nextServer = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NEXT_PUBLIC_API_URL: BASE },
  detached: true,
});

const deadline = Date.now() + 60_000;
while (Date.now() < deadline) {
  try {
    const res = await fetch(`${BASE}/login`, { redirect: 'manual' });
    if (res.status >= 200 && res.status < 500) break;
  } catch {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
try {
  const context = await browser.newContext();

  // Mock auth exactly like the e2e suite: persisted session + auth cookies.
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    ['bp-session', JSON.stringify({ state: { isLoggedIn: true }, version: 0 })],
  );
  const sessionRes = await context.request.post(`${BASE}/api/auth/session`, {
    data: { token: 'verify.mock.jwt', role: 'merchant' },
  });
  if (!sessionRes.ok()) throw new Error('mock session setup failed');

  // Same-origin API mock (the SW caches what it sees, including these).
  // `payment*` covers both GET /api/payments (list) and POST /api/payment-links
  // (creation) — the service worker's background-sync replay hits the latter.
  const created = [];
  let payments = [
    {
      id: 'pl_offline_verify_1',
      txHash: null,
      payerAddress: null,
      merchantId: 'm_verify',
      amountUsdc: 250,
      amountNgn: null,
      fxRate: null,
      status: 'active',
      source: 'Consulting Retainer',
      createdAt: '2026-06-01T10:00:00.000Z',
      url: null,
      clicks: 4,
      converted: 2,
    },
  ];
  await context.route('**/api/payment*', (route) => {
    const request = route.request();
    const origin = request.headers()['origin'] || '*';
    const headers = { ...corsHeaders(origin), 'content-type': 'application/json' };
    if (request.method() === 'OPTIONS') {
      route.fulfill({ status: 204, headers });
      return;
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON?.() ?? {};
      const link = {
        id: `pl_offline_verify_${created.length + 2}`,
        txHash: null,
        payerAddress: null,
        merchantId: 'm_verify',
        amountUsdc: typeof body.amount === 'number' ? body.amount : 0,
        amountNgn: null,
        fxRate: null,
        status: 'active',
        source: body.label || 'Untitled',
        createdAt: new Date().toISOString(),
        url: null,
        clicks: 0,
        converted: 0,
      };
      created.push(link);
      payments = [link, ...payments];
      route.fulfill({ status: 201, headers, body: JSON.stringify({ data: link }) });
      return;
    }
    route.fulfill({ status: 200, headers, body: JSON.stringify({ data: payments }) });
  });
  // Payments details/stat endpoints used by the dashboard.
  await context.route('**/api/settlements**', (route) => {
    const headers = { ...corsHeaders(route.request().headers()['origin'] || '*'), 'content-type': 'application/json' };
    route.fulfill({ status: 200, headers, body: JSON.stringify({ data: [] }) });
  });
  await context.route('**/api/rates**', (route) => {
    const headers = { ...corsHeaders(route.request().headers()['origin'] || '*'), 'content-type': 'application/json' };
    route.fulfill({ status: 200, headers, body: JSON.stringify({ rates: [], usdcNgn: 1550 }) });
  });

  const page = await context.newPage();

  // ── First load (online) ──
  // Visit both dashboard and payments while online so their HTML shells are
  // cached by the service worker's navigation handler before we go offline.
  // (`networkidle` never settles — the app keeps a health poll + SSE open.)
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' });

  await page.waitForFunction(() => navigator.serviceWorker?.controller != null, null, {
    timeout: 20_000,
  });
  check('Service worker installed and controlling the page', true);

  await page.getByText('Consulting Retainer').first().waitFor({ timeout: 20_000 });
  check('Payment link rendered on first load', true);

  await page.goto(`${BASE}/payments`, { waitUntil: 'load' });
  await page.getByText('Consulting Retainer').first().waitFor({ timeout: 20_000 });

  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const open = (name) => caches.open(name).then((c) => c.keys()).catch(() => []);
    const precache = await open(keys.find((k) => k.startsWith('workbox-precache')) ?? 'missing');
    const api = await open('bettapay-api-v1');
    const shell = await open('bettapay-shell-v1');
    return {
      precacheCount: precache.length,
      apiUrls: api.map((r) => r.url),
      shellUrls: shell.map((r) => r.url),
    };
  });
  check('App shell precached (JS/CSS/fonts in cache)', cached.precacheCount > 100, `${cached.precacheCount} entries`);
  check(
    'GET API list response cached stale-while-revalidate',
    cached.apiUrls.some((u) => u.includes('/api/payments')),
    cached.apiUrls.join(', '),
  );
  check(
    'HTML shell cached per route (offline navigation works)',
    cached.shellUrls.some((u) => u.includes('/payments')),
    cached.shellUrls.join(', '),
  );

  // ── Go offline and reload: shell + data must come from the SW ──
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const offlineOnline = await page.evaluate(() => navigator.onLine);
  check('Browser reports offline after reload', offlineOnline === false);

  await page.getByText('Consulting Retainer').first().waitFor({ timeout: 20_000 }).catch(() => null);
  const linkVisibleOffline = await page.getByText('Consulting Retainer').first().isVisible().catch(() => false);
  check('Dashboard renders offline with cached payment link', linkVisibleOffline);

  const bannerVisible = await page
    .getByRole('alert')
    .filter({ hasText: /offline/i })
    .first()
    .isVisible()
    .catch(() => false);
  check('Offline banner shown (API reachability via healthz)', bannerVisible);

  // ── Create a payment link while offline → queued for background sync ──
  await page.goto(`${BASE}/payments`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /new payment link/i }).click();
  await page.getByLabel(/title \/ label/i).fill('Offline Invoice');
  await page.getByRole('button', { name: /create link/i }).click();

  // The enqueue is async (IndexedDB + service worker handshake); the toast can
  // appear a moment after submit, so wait for it.
  const queuedToast = await page
    .getByText(/saved offline/i)
    .first()
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  check('Offline-created payment link queued with confirmation toast', queuedToast);

  const badge = await page.getByText(/offline link.*waiting to sync/i).first().isVisible().catch(() => false);
  check('Pending-sync badge appears in the header', badge);

  // ── Connectivity returns → background sync replays the POST ──
  await context.setOffline(false);
  await page.waitForFunction(() => navigator.onLine, null, { timeout: 10_000 });

  const replayDeadline = Date.now() + 20_000;
  while (Date.now() < replayDeadline && created.length === 0) {
    await new Promise((r) => setTimeout(r, 300));
  }
  check(
    'Queued payment-link POST replayed on reconnect',
    created.length === 1,
    created.length > 0 ? JSON.stringify(created[0]) : 'no POST seen',
  );

  // The replayed link appears in the list after the automatic refetch.
  await page.getByText('Offline Invoice').first().waitFor({ timeout: 20_000 }).catch(() => null);
  const syncedLinkVisible = await page.getByText('Offline Invoice').first().isVisible().catch(() => false);
  check('Background-synced link visible in the list', syncedLinkVisible);

  const badgeGone = !(await page.getByText(/waiting to sync/i).first().isVisible().catch(() => false));
  check('Pending-sync badge cleared after sync', badgeGone);
} finally {
  await browser.close();
  try {
    process.kill(-nextServer.pid, 'SIGTERM');
  } catch {
    nextServer.kill('SIGTERM');
  }
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  process.exitCode = 1;
}
