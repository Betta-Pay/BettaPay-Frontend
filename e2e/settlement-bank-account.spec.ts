import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Bank-account configuration on /settlement (#1153).
 *
 * `settlement.spec.ts` covers the settlement submission/confirmation flow; this
 * spec covers the payout-account form it depends on. A malformed destination
 * account must be rejected client-side before anything reaches the backend, so
 * these tests drive the validation and a clean save with the merchant API
 * mocked.
 */

test.use({ storageState: AUTH_STORAGE_STATE });

test.beforeEach(async ({ context, page }) => {
  await mockMerchantApi(context);
  // `mockMerchantApi`'s merchant catch-all returns a profile without `bankName`,
  // which `useMerchantBankAccount` resolves to `null` — so the account starts
  // unconfigured and the "Configure Bank Account" affordance is the entry point.
  await gotoAuthed(page, '/settlement');
  await expect(page.getByRole('heading', { name: /^settlement$/i })).toBeVisible();
});

/** Open the configure-bank-account dialog and return its locator. */
async function openBankDialog(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /configure bank account/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /configure bank account/i })).toBeVisible();
  return dialog;
}

test.describe('Bank account configuration', () => {
  test('blocks an empty submission with per-field errors', async ({ page }) => {
    const dialog = await openBankDialog(page);

    await dialog.getByRole('button', { name: /save bank account/i }).click();

    await expect(dialog.getByText('Account holder name is required')).toBeVisible();
    await expect(dialog.getByText('Bank name is required')).toBeVisible();
    await expect(dialog.getByText('Bank code / routing number is required')).toBeVisible();
    await expect(dialog.getByText('Account number is required')).toBeVisible();
  });

  test('rejects a malformed account number and bank code', async ({ page }) => {
    const dialog = await openBankDialog(page);

    await dialog.locator('#bank-account-name').fill('Acme Tech Solutions');
    await dialog.locator('#bank-name').fill('GTBank');
    await dialog.locator('#bank-code').fill('!!');
    await dialog.locator('#account-number').fill('123');

    await dialog.getByRole('button', { name: /save bank account/i }).click();

    await expect(dialog.getByText(/invalid account number or iban format/i)).toBeVisible();
    await expect(dialog.getByText(/bank code must be 3/i)).toBeVisible();

    // The offending fields are flagged for assistive tech, not just coloured.
    await expect(dialog.locator('#account-number')).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.locator('#bank-code')).toHaveAttribute('aria-invalid', 'true');
  });

  test('saves a valid account and closes the dialog', async ({ page, context }) => {
    let savedBody: unknown = null;
    await context.route('**/api/merchants/**/bank-account', (route) => {
      const request = route.request();
      const headers = {
        'access-control-allow-origin': request.headers()['origin'] || '*',
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,PUT,OPTIONS',
        'access-control-allow-headers': 'Content-Type,Authorization',
      };
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers });
      }
      if (request.method() === 'PUT') {
        savedBody = request.postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify({
            bankName: 'GTBank',
            bankCode: '058',
            accountNumber: '0123456789',
            accountName: 'Acme Tech Solutions',
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: 'null' });
    });

    const dialog = await openBankDialog(page);

    await dialog.locator('#bank-account-name').fill('Acme Tech Solutions');
    await dialog.locator('#bank-name').fill('GTBank');
    await dialog.locator('#bank-code').fill('058');
    await dialog.locator('#account-number').fill('0123456789');

    await dialog.getByRole('button', { name: /save bank account/i }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(/bank account details saved successfully/i)).toBeVisible();
    expect(savedBody).toMatchObject({
      bankName: 'GTBank',
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'Acme Tech Solutions',
    });
  });
});
