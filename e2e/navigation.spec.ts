import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Desktop navigation: the merchant sidebar routes between sections and marks
 * the active one, and the top-bar user menu exposes account actions.
 */

test.use({ storageState: AUTH_STORAGE_STATE });

test.beforeEach(async ({ context, page }) => {
  await mockMerchantApi(context);
  await gotoAuthed(page, '/dashboard');
});

test.describe('Sidebar navigation', () => {
  const DESTINATIONS: Array<{ link: RegExp; url: RegExp }> = [
    { link: /payments/i, url: /\/payments/ },
    { link: /transactions/i, url: /\/transactions/ },
    { link: /settlement/i, url: /\/settlement/ },
    { link: /settings/i, url: /\/settings/ },
  ];

  for (const { link, url } of DESTINATIONS) {
    test(`navigates to ${url.source}`, async ({ page }) => {
      const nav = page.getByRole('navigation', { name: /main navigation/i });
      await nav.getByRole('link', { name: link }).first().click();
      await expect(page).toHaveURL(url);
    });
  }

  test('marks the active route as current', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await nav.getByRole('link', { name: /payments/i }).first().click();
    await expect(page).toHaveURL(/\/payments/);
    await expect(
      nav.getByRole('link', { name: /payments/i }).first(),
    ).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('User menu', () => {
  test('opens and exposes account actions', async ({ page }) => {
    await page.getByRole('button', { name: /user menu/i }).click();

    const menu = page.getByRole('menu');
    await expect(menu.getByText(/profile settings/i)).toBeVisible();
    await expect(menu.getByText(/log out/i)).toBeVisible();
  });

  test('logs out from the user menu', async ({ page }) => {
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /log out/i }).click();

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 });
  });
});
