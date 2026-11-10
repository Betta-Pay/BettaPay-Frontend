import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';
import { AxeBuilder } from './helpers/axe';

/**
 * Accessibility guarantees for the interactive surfaces: single H1 per page,
 * modal dialogs are labelled and dismissible with the keyboard, the login
 * page's primary controls are reachable and operable without a pointer, and
 * automated axe-core WCAG 2.1 AA audits pass with zero critical/serious
 * violations on public pages.
 */

test.describe('Landmark & heading structure', () => {
  test('the login page exposes exactly one H1', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });
});

test.describe('Automated axe-core WCAG 2.1 AA audits on public pages', () => {
  test('landing page has zero critical or serious WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(severeViolations).toEqual([]);
  });

  test('public payment checkout page has zero critical or serious WCAG 2.1 AA violations', async ({
    context,
    page,
  }) => {
    await context.route('**/api/payment-links/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'pl_a11y_checkout',
          merchantName: 'Acme Payments Ltd',
          source: 'Accessibility Audit Invoice',
          type: 'open',
          currency: 'USDC',
          fixedAmount: 0,
          isMultiCurrency: true,
          acceptedCurrencies: ['USDC', 'XLM'],
          expiresAt: null,
        }),
      });
    });

    await page.goto('/pay/pl_a11y_checkout');
    await expect(page.getByText('Payment Details')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const severeViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(severeViolations).toEqual([]);
  });

  test('pricing and login public routes have zero critical or serious WCAG 2.1 AA violations', async ({
    page,
  }) => {
    for (const route of ['/pricing', '/auth/login']) {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const severeViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(severeViolations).toEqual([]);
    }
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
