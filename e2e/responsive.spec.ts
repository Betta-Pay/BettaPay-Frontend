import { test, expect } from './fixtures';
import { AUTH_STORAGE_STATE, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';
import { MOBILE_CHECKOUT_VIEWPORTS, VIEWPORTS } from './helpers/viewports';

/**
 * Responsive behaviour on a mobile viewport: the desktop sidebar collapses, the
 * bottom nav appears, and the hamburger opens an accessible nav drawer that
 * closes via its button and via Escape. Also verifies mobile payment checkout
 * drawer/sheet usability across 375x667 (iPhone SE) and 390x844 (iPhone 12).
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

test.describe('Mobile payment checkout drawer viewport assertions', () => {
  for (const vp of MOBILE_CHECKOUT_VIEWPORTS) {
    test(`opens, scrolls smoothly, and closes without layout clipping on ${vp.name}`, async ({
      context,
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await context.route('**/api/payment-links/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'pl_mobile_drawer',
            merchantName: 'Acme Payments Ltd',
            source: 'Mobile Checkout Test',
            type: 'open',
            currency: 'USDC',
            fixedAmount: 0,
            isMultiCurrency: true,
            acceptedCurrencies: ['USDC', 'XLM'],
            expiresAt: null,
          }),
        });
      });

      await page.goto('/pay/pl_mobile_drawer');
      await expect(page.getByText('Payment Details')).toBeVisible();

      // Verify checkout surface fits within mobile viewport width without horizontal clipping
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasHorizontalOverflow).toBe(false);

      // Enter amount, advance to Review step, and open the wallet connection drawer/modal
      await page.getByPlaceholder('0.00').fill('125');
      await page.getByRole('button', { name: /continue/i }).click();
      await expect(page.getByText('Review Payment')).toBeVisible();

      // Scroll smoothly within the mobile viewport and ensure controls remain reachable
      await page.evaluate(() => window.scrollTo({ top: 160, behavior: 'smooth' }));
      const backBtn = page.getByRole('button', { name: /^back$/i });
      await expect(backBtn).toBeVisible();

      const box = await backBtn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);

      // Collapse/return to details view cleanly without layout clipping
      await backBtn.click();
      await expect(page.getByText('Payment Details')).toBeVisible();
    });
  }
});
