import { test, expect } from './fixtures';
import { mockLogin, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Authentication flows.
 *
 * The production sign-in methods (Google OAuth, Freighter wallet) rely on
 * third-party surfaces that can't run headlessly, so we test what the app
 * itself owns and can be asserted deterministically:
 *   - the login page presents both sign-in options,
 *   - the Google entry point renders (as its configured or not-configured form),
 *   - the wallet (Freighter) modal opens and closes,
 *   - middleware protects merchant routes from anonymous users,
 *   - a mock session persists across reloads, and
 *   - logging out clears the session and re-protects the routes.
 */

test.describe('Login page', () => {
  test('shows the Google and Freighter sign-in options', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // The wallet option is always rendered by the app.
    await expect(page.getByRole('button', { name: /connect freighter wallet/i })).toBeVisible();

    // Google appears either as the real GoogleLogin iframe (when a client id is
    // configured) or as the disabled "Continue with Google" fallback button
    // (when it is not). Accept either so the test doesn't depend on env config.
    const googleFallback = page.getByRole('button', { name: /continue with google/i });
    const googleIframe = page.locator('iframe[src*="accounts.google.com"]');
    await expect(googleFallback.or(googleIframe).first()).toBeVisible();
  });

  test('Google sign-in is disabled with guidance when not configured', async ({ page }) => {
    await page.goto('/auth/login');

    const googleFallback = page.getByRole('button', { name: /continue with google/i });

    // In an environment without NEXT_PUBLIC_GOOGLE_CLIENT_ID the button renders
    // disabled and describes why. When a client id *is* configured this branch
    // is absent, so we skip rather than assert a false negative.
    if ((await googleFallback.count()) === 0) {
      test.skip(true, 'Google client id is configured in this environment');
    }

    await expect(googleFallback).toBeDisabled();
    await expect(googleFallback).toHaveAttribute('title', /not configured/i);
  });
});

test.describe('Wallet (Freighter) login', () => {
  test('opens the wallet modal and can be dismissed', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByRole('button', { name: /connect freighter wallet/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/connect a wallet/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: /connect with freighter/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /walletconnect/i })).toBeVisible();

    // Escape closes the modal.
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('Cancel closes the wallet modal without signing in', async ({ page }) => {
    await page.goto('/auth/login');

    await page.getByRole('button', { name: /connect freighter wallet/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await modal.getByRole('button', { name: /^cancel$/i }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Route protection', () => {
  test('anonymous users are redirected from a protected route to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Bounced to (the locale-prefixed) login…
    await expect(page).toHaveURL(/\/auth\/login/);

    // …carrying the original destination so the user lands back where they
    // intended after signing in.
    await expect(page).toHaveURL(/redirect=.*dashboard/);
  });
});

test.describe('Invalid credentials', () => {
  test('shows an error and keeps the user on the login page', async ({ context, page }) => {
    // The email form authenticates by POSTing to the session route; make it
    // reject the attempt the way a wrong password would (issue #1151). Reads
    // (GET) still fall through to the real handler.
    await context.route('**/api/auth/session', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' }),
        });
        return;
      }
      await route.fallback();
    });

    await page.goto('/auth/login');

    const emailForm = page.getByRole('form', { name: /sign in with email and password/i });
    await emailForm.getByLabel(/email/i).fill('merchant@bettapay.com');
    await emailForm.getByLabel(/password/i).fill('WrongPassword!');
    await emailForm.getByRole('button', { name: /sign in with email/i }).click();

    // The failure surfaces as an error toast and the user is *not* redirected.
    await expect(page.getByText(/failed to sign in/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Session persistence', () => {
  test.beforeEach(async ({ context }) => {
    await mockMerchantApi(context);
    await mockLogin(context, 'merchant');
  });

  test('a mock session grants access and survives a reload', async ({ page }) => {
    await gotoAuthed(page, '/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/merchant dashboard/i)).toBeVisible();

    // Reloading must not bounce the user back to the login page.
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/merchant dashboard/i)).toBeVisible();
  });

  test('an authenticated user visiting /auth/login is sent to the dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe('Logout', () => {
  test.beforeEach(async ({ context }) => {
    await mockMerchantApi(context);
    await mockLogin(context, 'merchant');
  });

  test('logging out clears the session and re-protects routes', async ({ page, context }) => {
    await gotoAuthed(page, '/settings');
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();

    // The session cookie is present while signed in…
    expect((await context.cookies()).some((c) => c.name === 'auth_token')).toBe(true);

    await page.getByRole('button', { name: /log out/i }).click();

    // …redirected to login…
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 });

    // …the session cookie is torn down…
    expect((await context.cookies()).some((c) => c.name === 'auth_token')).toBe(false);

    // …and protected routes redirect again.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
