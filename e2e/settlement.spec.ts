import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Settlement flows: initiate a settlement (summary → processing → receipt) and
 * view the settlement history.
 *
 * History rows and the balance stat cards are driven by mocked
 * `/api/settlements` fixtures. The confirmation dialog is a self-contained
 * client state machine (no backend), so the full happy path is deterministic.
 */

test.use({ storageState: AUTH_STORAGE_STATE });

test.beforeEach(async ({ context, page }) => {
  await mockMerchantApi(context);
  await gotoAuthed(page, '/settlement');
  await expect(page.getByRole('heading', { name: /^settlement$/i })).toBeVisible();
});

test.describe('Initiate settlement', () => {
  test('requires the irreversibility acknowledgement before confirming', async ({ page }) => {
    await page.getByRole('button', { name: /initiate settlement/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/confirm settlement/i)).toBeVisible();

    // Confirm is gated on the acknowledgement checkbox.
    const confirm = dialog.getByRole('button', { name: /confirm settlement/i });
    await expect(confirm).toBeDisabled();

    await dialog.getByRole('checkbox').check();
    await expect(confirm).toBeEnabled();
  });

  test('completes the settlement and shows a receipt', async ({ page }) => {
    await page.getByRole('button', { name: /initiate settlement/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: /confirm settlement/i }).click();

    // Transient processing state, then the receipt.
    await expect(page.getByText(/processing settlement/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /settlement receipt/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/settlement completed successfully/i)).toBeVisible();

    // Receipt can be dismissed.
    await page.getByRole('button', { name: /^close$/i }).click();
    await expect(page.getByRole('heading', { name: /settlement receipt/i })).toBeHidden();
  });
});

test.describe('Settlement history', () => {
  test('renders the history and balance summary from data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /settlement history/i })).toBeVisible();

    // Balance stat cards.
    await expect(page.getByText(/available to settle/i)).toBeVisible();
    await expect(page.getByText(/pending settlement/i)).toBeVisible();
    await expect(page.getByText(/total settled/i)).toBeVisible();

    // A completed settlement exposes a Stellar Explorer link (it has a tx hash).
    await expect(
      page.getByRole('link', { name: /view on stellar explorer/i }).first(),
    ).toBeVisible();

    // Destination bank from the fixtures is shown on the rows.
    await expect(page.getByText(/GTBank/).first()).toBeVisible();
  });

  test('exposes an export control for the history', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^export$/i })).toBeVisible();
  });

  test('surfaces an error with retry when the history fails to load', async ({ page }) => {
    // The page exposes a "Simulate Error" toggle for the history surface.
    await page.getByRole('button', { name: /simulate error/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();

    // Recover.
    await page.getByRole('button', { name: /try again/i }).click();
    await expect(page.getByRole('heading', { name: /settlement history/i })).toBeVisible();
  });
});
