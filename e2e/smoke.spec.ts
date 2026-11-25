import { test, expect } from '@playwright/test';

/**
 * BettaPay E2E Smoke Tests
 *
 * These smoke tests verify the critical user journeys across the app:
 *   1. Landing page loads and displays a CTA button
 *   2. Navigate to login, fill form, submit, and redirect to dashboard
 *   3. Dashboard loads with KPI cards and revenue chart
 *   4. Navigate via sidebar to Settings and verify the page renders
 *   5. Navigate via sidebar to Transactions and verify the table renders
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Perform a mock login via the login page and wait until the dashboard loads.
 * The login form uses mock auth so any well-formed email + password will work.
 */
async function loginAsMerchant(page: import('@playwright/test').Page) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill('merchant@bettapay.com');
  await page.getByLabel(/password/i).fill('Password123!');
  await page.getByRole('button', { name: /sign in/i }).click();

  // The login flow redirects merchants to /dashboard.
  // Wait for the URL to settle on the dashboard.
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ─── 1. Landing page loads and has a CTA button ─────────────────────────────

test.describe('Landing Page', () => {
  test('loads and displays the primary CTA button', async ({ page }) => {
    await page.goto('/');

    // The headline should be visible
    await expect(
      page.getByRole('heading', { level: 1 }),
    ).toBeVisible();

    // The primary CTA "Start Accepting Crypto" must be present
    const ctaButton = page.getByRole('link', { name: /start accepting crypto/i });
    await expect(ctaButton).toBeVisible();

    // CTA should link to the registration page
    await expect(ctaButton).toHaveAttribute('href', '/auth/register');
  });
});

// ─── 2. Login flow ──────────────────────────────────────────────────────────

test.describe('Login Flow', () => {
  test('navigates to login, fills form, submits, and redirects to dashboard', async ({
    page,
  }) => {
    // Start on the landing page and click "Log in" in the header
    await page.goto('/');
    await page.getByRole('link', { name: /log in/i }).click();

    // Verify we're on the login page
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(
      page.getByRole('heading', { name: /sign in/i }),
    ).toBeVisible();

    // Fill and submit the login form
    await page.getByLabel(/email/i).fill('merchant@bettapay.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to the merchant dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

// ─── 3. Dashboard renders KPI cards and chart ───────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMerchant(page);
  });

  test('loads with KPI stat cards and a revenue chart', async ({ page }) => {
    // The welcome heading should mention "Merchant Dashboard"
    await expect(page.getByText(/merchant dashboard/i)).toBeVisible();

    // Verify at least 3 of the 4 KPI card titles are visible
    await expect(page.getByText(/total volume/i)).toBeVisible();
    await expect(page.getByText(/active payment links/i)).toBeVisible();
    await expect(page.getByText(/available to settle/i)).toBeVisible();

    // The revenue chart section should be present
    await expect(page.getByText(/revenue over time/i)).toBeVisible();
  });
});

// ─── 4. Sidebar navigation → Settings ───────────────────────────────────────

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMerchant(page);
  });

  test('navigates to Settings via sidebar and renders the page', async ({
    page,
  }) => {
    // Click the "Settings" link in the sidebar (desktop nav)
    await page.getByRole('navigation', { name: /main navigation/i })
      .getByRole('link', { name: /settings/i })
      .click();

    // Verify the URL changed
    await expect(page).toHaveURL(/\/settings/);

    // The Settings page heading should be visible
    await expect(
      page.getByRole('heading', { name: /settings/i }),
    ).toBeVisible();

    // The "Profile Details" card should render by default
    await expect(page.getByText(/profile details/i)).toBeVisible();
  });
});

// ─── 5. Sidebar navigation → Transactions ──────────────────────────────────

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsMerchant(page);
  });

  test('navigates to Transactions via sidebar and renders the table', async ({
    page,
  }) => {
    // Click "Transactions" in the sidebar
    await page.getByRole('navigation', { name: /main navigation/i })
      .getByRole('link', { name: /transactions/i })
      .click();

    // Verify URL
    await expect(page).toHaveURL(/\/transactions/);

    // Page heading
    await expect(
      page.getByRole('heading', { name: /transactions/i }),
    ).toBeVisible();

    // The table should render with expected column headers
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /payer/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });
});

// ─── 6. Route integrity across core public / marketing routes ───────────────

/**
 * Core public and marketing routes. Each is expected to render a visible
 * primary heading without throwing an uncaught client exception or logging an
 * unexpected console error — a status-200-only smoke check can pass even when a
 * React client boundary crashes immediately after hydration (issue #1149/#1150).
 */
const PUBLIC_ROUTES: ReadonlyArray<{ name: string; path: string }> = [
  { name: 'landing', path: '/' },
  { name: 'pricing', path: '/pricing' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'fiat-settlements', path: '/fiat-settlements' },
  { name: 'guides', path: '/guides' },
  { name: 'sdks', path: '/sdks' },
  { name: 'status', path: '/status' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'auth-login', path: '/auth/login' },
  { name: 'auth-register', path: '/auth/register' },
];

/**
 * Console errors that are environmental rather than application regressions:
 * static assets that aren't served, the expected 4xx from the absent backend,
 * and the dev-server HMR socket.
 */
const IGNORED_CONSOLE_ERRORS: readonly RegExp[] = [
  /Failed to load resource/i,
  /net::ERR_/i,
  /favicon/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /the server responded with a status of/i,
];

test.describe('Route integrity (public & marketing)', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) renders without client errors`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];

      // Attach listeners *before* navigating so nothing thrown during the
      // initial render/hydration escapes collection.
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (IGNORED_CONSOLE_ERRORS.some((pattern) => pattern.test(text))) return;
        consoleErrors.push(text);
      });

      await page.goto(route.path);

      // A visible level-1 heading proves the route rendered its primary content
      // rather than crashing into an error boundary.
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

      expect(pageErrors, `uncaught client errors on ${route.path}`).toEqual([]);
      expect(consoleErrors, `unexpected console errors on ${route.path}`).toEqual([]);
    });
  }
});
