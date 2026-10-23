import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Accessibility guarantees for the interactive surfaces: single H1 per page,
 * modal dialogs are labelled and dismissible with the keyboard, and the login
 * page's primary controls are reachable and operable without a pointer.
 */

test.describe('Landmark & heading structure', () => {
  test('the login page exposes exactly one H1', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
});

test.describe('Dialog keyboard operability', () => {
  test.use({ storageState: AUTH_STORAGE_STATE });

  test.beforeEach(async ({ context, page }) => {
    await mockMerchantApi(context);
    await gotoAuthed(page, '/payments');
    await expect(page.getByRole('heading', { name: /payment links/i })).toBeVisible();
  });

  test('the create dialog is labelled and closes with Escape', async ({ page }) => {
    await page.getByRole('button', { name: /new payment link/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The dialog has an accessible name (its title).
    await expect(dialog.getByText(/create payment link/i)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('focus moves into the dialog when opened', async ({ page }) => {
    await page.getByRole('button', { name: /new payment link/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The label field autofocuses, so focus should already be inside the dialog.
    const focusInDialog = await dialog.evaluate((el) => el.contains(document.activeElement));
    expect(focusInDialog).toBeTruthy();
  });
});

test.describe('Login page keyboard operability', () => {
  test('the wallet button is reachable and activates with the keyboard', async ({ page }) => {
    await page.goto('/auth/login');

    const walletBtn = page.getByRole('button', { name: /connect freighter wallet/i });
    await walletBtn.focus();
    await expect(walletBtn).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
