import { test, expect } from './fixtures';
import { mockLogin, gotoAuthed } from './helpers/auth';
import { mockMerchantApi } from './helpers/api';

/**
 * Visual regression test for ProfileEditor error states.
 * Captures a baseline screenshot of the form with all validation errors
 * visible, preventing CSS regressions from breaking the error layout.
 */

test.describe('ProfileEditor visual regression', () => {
  test.beforeEach(async ({ context, page }) => {
    await mockMerchantApi(context);
    await mockLogin(context, 'merchant');
    await gotoAuthed(page, '/settings');
    await expect(page.getByRole('heading', { name: /^settings$/i })).toBeVisible();
  });

  test('captures baseline screenshot of errored form state', async ({ page }) => {
    const profileCard = page.locator('[class*="border-border"][class*="bg-card"]').first();
    await expect(profileCard).toBeVisible();

    // Clear all required fields to trigger Zod validation errors
    const businessName = page.getByPlaceholder(/enter business name/i);
    await businessName.clear();

    const country = page.getByPlaceholder(/e\.g\. nigeria/i);
    await country.clear();

    const industry = page.getByPlaceholder(/e\.g\. fintech/i);
    await industry.clear();

    const email = page.getByPlaceholder(/contact@example\.com/i);
    await email.clear();

    // Submit to trigger validation
    await page.getByRole('button', { name: /save changes/i }).click();

    // Wait for all error messages to appear
    await expect(page.getByText('Business name is required')).toBeVisible();
    await expect(page.getByText('Country is required')).toBeVisible();
    await expect(page.getByText('Industry is required')).toBeVisible();
    await expect(page.getByText('Invalid email format')).toBeVisible();

    // Visual comparison — first run creates the baseline
    await expect(profileCard).toHaveScreenshot('profile-editor-errored-state.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});
