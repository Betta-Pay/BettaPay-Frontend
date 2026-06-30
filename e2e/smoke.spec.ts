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
