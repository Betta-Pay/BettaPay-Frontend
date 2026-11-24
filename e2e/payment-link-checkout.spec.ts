import { test, expect } from './fixtures';
import type { BrowserContext, Request, Route } from '@playwright/test';

/**
 * Public payment-link checkout (#1152).
 *
 * Complements `payment-flow.spec.ts` (which drives the happy path end-to-end
 * with a Freighter mock) by covering the parts it does not:
 *   - the SEP-0007 QR / mobile-wallet deep link on the checkout
 *   - an expired FX quote and the "Refresh Quote" recovery
 *   - the status page actually *polling* and transitioning (processing →
 *     success), rather than being handed a terminal state up front
 *
 * Everything is hermetic: the payment-link, rates, and status endpoints are
 * mocked on the browser context, so no backend or Horizon is contacted.
 *
 * The SEP-0007 QR only renders when `NEXT_PUBLIC_MERCHANT_ADDRESS` is set,
 * which `playwright.config.ts` provides for the dev server.
 */

const LINK_ID = 'pl_e2e_consulting';
const MERCHANT_ADDRESS = 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD';
const TX_ID = 'tx_e2e_poll_123456';

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers()['origin'] || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type,Authorization,X-CSRF-Token,x-csrf-token',
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders(request) });
    return;
  }
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders(request),
    body: JSON.stringify(body),
  });
}

/** Open-amount payment link so the payer can type any value. */
async function mockPaymentLink(context: BrowserContext): Promise<void> {
  await context.route('**/api/payment-links/**', (route) =>
    fulfillJson(route, {
      id: LINK_ID,
      merchantName: 'BettaPay Merchant LLC',
      type: 'open',
      currency: 'USDC',
      fixedAmount: 0,
      isMultiCurrency: false,
      acceptedCurrencies: ['USDC'],
      expiresAt: null,
      source: 'Consulting Retainer',
    }),
  );
}

test.describe('Payment link checkout', () => {
  test('renders the SEP-0007 QR and mobile-wallet deep link', async ({ context, page }) => {
    await mockPaymentLink(context);
    await context.route('**/api/rates**', (route) => fulfillJson(route, { usdcNgn: 1600 }));

    await page.goto(`/pay/${LINK_ID}`);
    await expect(page.getByText('Payment Details')).toBeVisible();

    await page.getByPlaceholder('0.00').fill('250');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByText('Review Payment')).toBeVisible();

    // Switch to the mobile-wallet tab.
    await page.getByRole('button', { name: /mobile\s*\/\s*qr/i }).click();

    // QR canvas is rendered and the SEP-0007 help copy is shown.
    await expect(page.locator('canvas')).toBeVisible();
    await expect(
      page.getByText(/scan with lobstr, vibrant, or any stellar sep-0007 compliant mobile wallet/i),
    ).toBeVisible();

    // The deep link carries the merchant destination and the SEP-0007 scheme.
    const deepLink = page.getByRole('link', { name: /open in lobstr/i });
    await expect(deepLink).toBeVisible();
    const href = await deepLink.getAttribute('href');
    expect(href).toContain('web+stellar:pay');
    expect(href).toContain(`destination=${encodeURIComponent(MERCHANT_ADDRESS)}`);
  });

  test('surfaces an expired quote and recovers via Refresh Quote', async ({ context, page }) => {
    await mockPaymentLink(context);

    // The first `/api/rates` call fails → the quote is explicitly expired and
    // the "Refresh Quote" affordance is available; the retry succeeds.
    let ratesDown = true;
    await context.route('**/api/rates**', (route) => {
      if (ratesDown) return fulfillJson(route, { error: 'rate feed unavailable' }, 500);
      return fulfillJson(route, { usdcNgn: 1600 });
    });

    await page.goto(`/pay/${LINK_ID}`);
    await expect(page.getByText('Payment Details')).toBeVisible();

    const refresh = page.getByRole('button', { name: /refresh quote/i });
    await expect(refresh).toBeVisible();

    ratesDown = false;
    await refresh.click();

    // Recovered: the expired banner is gone and the locked rate is displayed.
    await expect(refresh).toBeHidden();
    await expect(page.getByText('1 USDC ≈ ₦1,600 NGN')).toBeVisible();
  });
});

test.describe('Payment status polling', () => {
  test('polls the status endpoint and transitions processing → success', async ({ context, page }) => {
    // First poll stays non-terminal, the next reports success — exercising the
    // real polling loop rather than a pre-seeded terminal state.
    let polls = 0;
    await context.route(`**/api/payments/${TX_ID}`, (route) => {
      polls += 1;
      if (polls < 2) {
        return fulfillJson(route, { id: TX_ID, status: 'processing', amount: 250, asset: 'USDC' });
      }
      return fulfillJson(route, { id: TX_ID, status: 'success', amount: 250, asset: 'USDC' });
    });

    await page.goto(`/pay/status/${TX_ID}`);

    await expect(page.getByText('Confirming Payment')).toBeVisible();
    await expect(page.getByText('Payment Successful')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/BettaPay Merchant LLC/)).toBeVisible();
    expect(polls).toBeGreaterThanOrEqual(2);
  });
});
