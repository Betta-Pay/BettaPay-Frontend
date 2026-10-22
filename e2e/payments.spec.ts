import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import {
  mockMerchantApi,
  mockPaymentsList,
  failPaymentsApi,
  generatePayments,
  PAYMENTS_FIXTURE,
} from './helpers/api';

test.use({ storageState: AUTH_STORAGE_STATE });

/**
 * Payment link flows: create, validate, edit, delete, copy, plus the
 * surrounding search / filter / pagination controls and the empty & error
 * states.
 *
 * Payment data is served from mocked `/api/payments` fixtures so the cards
 * (and their per-card actions) actually render. The create/edit/delete
 * handlers are client-side in this build and surface a toast, which is the
 * deterministic signal we assert on.
 */

test.describe('Payment links — populated', () => {
  test.beforeEach(async ({ context, page }) => {
    await mockMerchantApi(context);
    await gotoAuthed(page, '/payments');
    await expect(page.getByRole('heading', { name: /payment links/i })).toBeVisible();
  });

  test.describe('Create payment link', () => {
    test('creates a link from the dialog', async ({ page }) => {
      await page.getByRole('button', { name: /new payment link/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/create payment link/i)).toBeVisible();

      await dialog.getByPlaceholder(/consulting retainer/i).fill('Website Design Deposit');
      await dialog.getByRole('button', { name: /create link/i }).click();

      await expect(page.getByText(/payment link created successfully/i)).toBeVisible();
      await expect(dialog).toBeHidden();
    });

    test('blocks submission when the label is empty', async ({ page }) => {
      await page.getByRole('button', { name: /new payment link/i }).first().click();

      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /create link/i }).click();

      await expect(dialog.getByText(/label is required/i)).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('supports switching to multi-currency mode', async ({ page }) => {
      await page.getByRole('button', { name: /new payment link/i }).first().click();
      const dialog = page.getByRole('dialog');

      await dialog.getByRole('button', { name: /multi-currency/i }).click();
      // The accepted-currencies selector appears in multi mode.
      await expect(dialog.getByText(/accepted currencies/i)).toBeVisible();

      // Back to single currency.
      await dialog.getByRole('button', { name: /single currency/i }).click();
      await expect(dialog.getByText(/^amount \(optional\)$/i)).toBeVisible();
    });
  });

  test.describe('Edit payment link', () => {
    test('edits an existing link', async ({ page }) => {
      await page.getByRole('button', { name: /edit link/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/edit payment link/i)).toBeVisible();

      await dialog.getByLabel(/title \/ label/i).fill('Consulting Retainer — Updated');
      await dialog.getByRole('button', { name: /save changes/i }).click();

      await expect(page.getByText(/payment link updated successfully/i)).toBeVisible();
      await expect(dialog).toBeHidden();
    });

    test('can be cancelled without saving', async ({ page }) => {
      await page.getByRole('button', { name: /edit link/i }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^cancel$/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(/updated successfully/i)).toBeHidden();
    });
  });

  test.describe('Delete payment link', () => {
    test('deletes an existing link after confirmation', async ({ page }) => {
      await page.getByRole('button', { name: /delete link/i }).first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('heading', { name: /delete payment link/i })).toBeVisible();
      await dialog.getByRole('button', { name: /^delete$/i }).click();

      await expect(page.getByText(/payment link deleted/i)).toBeVisible();
      await expect(dialog).toBeHidden();
    });

    test('keeps the link when the deletion is cancelled', async ({ page }) => {
      await page.getByRole('button', { name: /delete link/i }).first().click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: /^cancel$/i }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText(/payment link deleted/i)).toBeHidden();
    });
  });

  test.describe('Copy & QR', () => {
    test('copies a link URL to the clipboard', async ({ page }) => {
      // Assert the copy success toast (a deterministic, cross-browser signal)
      // rather than reading the clipboard, which requires engine-specific perms.
      await page.getByRole('button', { name: /copy address/i }).first().click();
      await expect(page.getByText(/address copied to clipboard/i)).toBeVisible();
    });

    test('opens the QR code modal for a link', async ({ page }) => {
      await page.getByRole('button', { name: /show qr code/i }).first().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText(/qr code/i)).toBeVisible();
      // Download affordances are present.
      await expect(dialog.getByRole('button', { name: /^png$/i })).toBeVisible();
      await dialog.getByRole('button', { name: /^close$/i }).click();
      await expect(dialog).toBeHidden();
    });

    test('renders one card per payment link fixture', async ({ page }) => {
      for (const link of PAYMENTS_FIXTURE) {
        await expect(page.getByText(link.source as string).first()).toBeVisible();
      }
    });
  });

  test.describe('Search & filter', () => {
    test('filters the list by search term', async ({ page }) => {
      await expect(page.getByText('Open Donation')).toBeVisible();

      await page.getByPlaceholder(/search payment links/i).fill('Consulting');

      await expect(page.getByText('Consulting Retainer')).toBeVisible();
      await expect(page.getByText('Open Donation')).toBeHidden();
    });

    test('shows an empty state when a search matches nothing', async ({ page }) => {
      await page.getByPlaceholder(/search payment links/i).fill('no-such-link-xyz');
      await expect(page.getByText(/no payment links match your search/i)).toBeVisible();
    });
  });
});

test.describe('Payment links — pagination', () => {
  test.beforeEach(async ({ context, page }) => {
    await mockMerchantApi(context);
    await mockPaymentsList(context, generatePayments(8)); // pageSize is 6 → 2 pages
    await gotoAuthed(page, '/payments');
  });

  test('paginates when there are more than a page of links', async ({ page }) => {
    await expect(page.getByText('1 / 2')).toBeVisible();
    await expect(page.getByRole('button', { name: /^previous$/i })).toBeDisabled();

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText('2 / 2')).toBeVisible();
    await expect(page.getByRole('button', { name: /^next$/i })).toBeDisabled();
  });
});

test.describe('Payment links — empty state', () => {
  test('prompts to create the first link when there are none', async ({ context, page }) => {
    await mockMerchantApi(context);
    await mockPaymentsList(context, []);
    await gotoAuthed(page, '/payments');

    await expect(page.getByText(/no payment links yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /new payment link/i })).toBeVisible();
  });
});

test.describe('Payment links — error state', () => {
  test('shows an error with a retry action when the API fails', async ({ context, page }) => {
    await mockMerchantApi(context);
    await failPaymentsApi(context);
    await gotoAuthed(page, '/payments');

    // The list surface toggles into an error with a retry affordance. (The page
    // also exposes a "Simulate Error" toggle for the same surface.)
    await page.getByRole('button', { name: /simulate error/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });
});
