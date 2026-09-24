import { test, expect } from './fixtures';
import { mockLogin, gotoAuthed } from './helpers/auth';

/**
 * E2E coverage for the onboarding webhook step — specifically the SSRF
 * prevention logic that blocks private IPs and localhost URLs.
 */

const STORAGE_KEY = 'bettapay_onboarding_progress';

function seedOnboardingStep(context: import('@playwright/test').BrowserContext, step: number) {
  return context.addInitScript(
    ([key, progress]) => {
      try {
        window.localStorage.setItem(key, progress);
      } catch { /* ignore */ }
    },
    [STORAGE_KEY, JSON.stringify({
      step,
      data: {
        businessName: 'Test Corp',
        businessType: 'business',
        country: 'Nigeria',
        settlementCurrency: 'NGN',
        autoConvert: true,
        preferredAnchor: 'Cowry',
        autoSettle: true,
        webhookUrl: '',
        accountNumber: '',
        bankCode: '',
        bankName: '',
      },
      savedAt: Date.now(),
    })] as const,
  );
}

test.describe('Onboarding webhook SSRF validation', () => {
  test.beforeEach(async ({ context, page }) => {
    await mockLogin(context, 'merchant');
    await seedOnboardingStep(context, 3);
    await gotoAuthed(page, '/onboarding');
    await expect(page.getByRole('heading', { name: /webhook configuration/i })).toBeVisible();
  });

  test('blocks localhost URL with validation error', async ({ page }) => {
    await page.getByPlaceholder(/your-app\.com/i).fill('http://127.0.0.1:8080/webhook');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/URL must be HTTPS and cannot be a private IP or localhost/i)).toBeVisible();
  });

  test('blocks 192.168.x.x private IP', async ({ page }) => {
    await page.getByPlaceholder(/your-app\.com/i).fill('https://192.168.1.100/webhook');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/URL must be HTTPS and cannot be a private IP or localhost/i)).toBeVisible();
  });

  test('blocks localhost hostname', async ({ page }) => {
    await page.getByPlaceholder(/your-app\.com/i).fill('https://localhost:3000/webhook');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/URL must be HTTPS and cannot be a private IP or localhost/i)).toBeVisible();
  });

  test('accepts a valid HTTPS webhook URL', async ({ page }) => {
    await page.getByPlaceholder(/your-app\.com/i).fill('https://example.com/webhooks/bettapay');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/URL must be HTTPS and cannot be a private IP or localhost/i)).not.toBeVisible();
  });

  test('blocks http:// (non-HTTPS) URLs', async ({ page }) => {
    await page.getByPlaceholder(/your-app\.com/i).fill('http://example.com/webhook');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/Enter a valid URL, including https:\/\//i)).toBeVisible();
  });
});
