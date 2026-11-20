import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Settings flows across every tab: update the business profile, edit fee rules,
 * configure webhooks, manage API keys, toggle notifications and change the
 * password. Profile GET/PATCH are mocked so the form prefills and the save
 * resolves; the other tabs are client-side and surface toasts we assert on.
 */

test.use({ storageState: AUTH_STORAGE_STATE });

test.beforeEach(async ({ context, page }) => {
  await mockMerchantApi(context);
  await gotoAuthed(page, '/settings');
  await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();
});

test.describe('Update profile', () => {
  test('saves the business profile', async ({ page }) => {
    await expect(page.getByText(/business profile/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter business name/i)).toHaveValue('Acme Payments Ltd');

    await page.getByPlaceholder(/enter business name/i).fill('Acme Payments International');
    await page.getByRole('button', { name: /save changes/i }).click();

    await expect(page.getByText(/profile updated/i)).toBeVisible();
  });
});

test.describe('Fee rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: /^fee rules$/i }).click();
    await expect(page.getByText(/fee rules editor/i)).toBeVisible();
  });

  test('saves updated fee rules', async ({ page }) => {
    await page.getByRole('button', { name: /save fee rules/i }).click();
    await expect(page.getByText(/fee rules updated/i)).toBeVisible();
  });
});

test.describe('Configure webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: /^webhooks$/i }).click();
    await expect(page.getByText(/webhook configuration/i)).toBeVisible();
  });

  test('saves the webhook configuration', async ({ page }) => {
    await page.getByRole('button', { name: /save webhook config/i }).click();
    await expect(page.getByText(/webhook url saved/i)).toBeVisible();
  });

  test('rotates the signing secret', async ({ page }) => {
    await page.getByRole('button', { name: /rotate secret/i }).click();
    await expect(page.getByText(/webhook signing secret rotated/i)).toBeVisible();
  });

  test('sends a test ping', async ({ page }) => {
    await page.getByRole('button', { name: /test ping webhook/i }).click();
    await expect(page.getByText(/sent ping event to/i)).toBeVisible();
  });
});

test.describe('Manage API keys', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: /^api keys$/i }).click();
    await expect(page.getByText(/api keys management/i)).toBeVisible();
  });

  test('creates a new API key', async ({ page }) => {
    await page.getByRole('button', { name: /create api key/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/create new api key/i)).toBeVisible();

    await dialog.getByPlaceholder(/mobile app backend/i).fill('Mobile App Backend');
    await dialog.getByRole('button', { name: /create key/i }).click();

    await expect(page.getByText(/api key created successfully/i)).toBeVisible();
    await expect(page.getByText('Mobile App Backend')).toBeVisible();
  });

  test('requires a name before creating a key', async ({ page }) => {
    await page.getByRole('button', { name: /create api key/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /create key/i }).click();

    await expect(page.getByText(/key name is required/i)).toBeVisible();
  });

  test('lists the seeded API keys', async ({ page }) => {
    await expect(page.getByText('Production Backend')).toBeVisible();
    await expect(page.getByText('Staging Integration')).toBeVisible();
  });
});

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: /^notifications$/i }).click();
    await expect(page.getByText(/notification preferences/i)).toBeVisible();
  });

  test('toggles a notification preference', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: /payment received/i });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: /^security$/i }).click();
    await expect(page.getByRole('button', { name: /update password/i })).toBeVisible();
  });

  test('updates the password', async ({ page }) => {
    // The three password inputs are the only password fields on this tab.
    const pwd = page.locator('input[type="password"]');
    await pwd.nth(0).fill('CurrentPass123!');
    await pwd.nth(1).fill('NewPass456!');
    await pwd.nth(2).fill('NewPass456!');

    await page.getByRole('button', { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible();
  });
});
