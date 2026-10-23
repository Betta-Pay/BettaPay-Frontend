import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';
import { VIEWPORTS } from './helpers/viewports';

/**
 * Responsive behaviour on a mobile viewport: the desktop sidebar collapses, the
 * bottom nav appears, and the hamburger opens an accessible nav drawer that
 * closes via its button and via Escape.
 */

test.use({ viewport: VIEWPORTS.mobile });
test.use({ storageState: AUTH_STORAGE_STATE });

test.beforeEach(async ({ context, page }) => {
  await mockMerchantApi(context);
  await gotoAuthed(page, '/dashboard');
});

test('hides the desktop sidebar and shows the mobile chrome', async ({ page }) => {
  // Desktop sidebar is `hidden` below md.
  await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeHidden();

  // The hamburger toggle is available on mobile.
  await expect(page.getByRole('button', { name: /toggle mobile menu/i })).toBeVisible();
});

test('opens the mobile nav drawer and navigates', async ({ page }) => {
  await page.getByRole('button', { name: /toggle mobile menu/i }).click();

  const drawer = page.getByRole('dialog', { name: /mobile navigation/i });
  await expect(drawer).toBeVisible();

  await drawer.getByRole('link', { name: /payments/i }).first().click();
  await expect(page).toHaveURL(/\/payments/);
  // Selecting a destination closes the drawer.
  await expect(drawer).toBeHidden();
});

test('closes the mobile nav drawer with Escape', async ({ page }) => {
  await page.getByRole('button', { name: /toggle mobile menu/i }).click();

  const drawer = page.getByRole('dialog', { name: /mobile navigation/i });
  await expect(drawer).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('closes the mobile nav drawer with its close button', async ({ page }) => {
  await page.getByRole('button', { name: /toggle mobile menu/i }).click();

  const drawer = page.getByRole('dialog', { name: /mobile navigation/i });
  await expect(drawer).toBeVisible();

  await page.getByRole('button', { name: /close navigation menu/i }).click();
  await expect(drawer).toBeHidden();
});
