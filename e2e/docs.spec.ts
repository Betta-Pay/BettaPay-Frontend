import { test, expect, type Page } from '@playwright/test';

/**
 * The docs page renders a lot of server-highlighted markup, so in dev mode React
 * hydration can land noticeably after first paint. Interaction tests retry the
 * triggering action until it takes effect rather than asserting once and racing
 * hydration.
 */
async function retryUntil(action: () => Promise<void>, assertion: () => Promise<void>) {
  await expect(async () => {
    await action();
    await assertion();
  }).toPass({ timeout: 45_000 });
}

/**
 * The right-hand TOC is only rendered by a client effect, so its heading
 * appearing is a reliable "React has hydrated" signal at >= xl widths.
 */
async function waitForHydration(page: Page) {
  await expect(page.locator('#docs-toc-heading')).toBeVisible({ timeout: 45_000 });
}

/**
 * /docs — API Documentation page
 *
 * Covers the acceptance criteria that are easy to regress in a refactor:
 * layout + navigation, scroll-spy, the mobile drawer, syntax highlighting,
 * copy-to-clipboard, and full keyboard operability (skip link, sidebar,
 * tab switching, code copy).
 */

const SECTIONS = [
  'Overview',
  'Authentication',
  'Quickstart',
  'Merchants',
  'Payments',
  'Settlements',
  'FX & Rates',
  'Webhook Events',
  'Error Codes',
  'HTTP Status',
  'Webhook Integration',
  'Idempotency Keys',
  'Testing with Testnet',
];

test.describe('Docs — layout and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
  });

  test('renders a single h1 and the full sidebar navigation', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(
      page.getByRole('heading', { level: 1, name: /BettaPay API Documentation/i }),
    ).toBeVisible();

    const sidebar = page.getByRole('navigation', { name: 'Documentation' }).first();
    for (const section of SECTIONS) {
      await expect(sidebar.getByRole('link', { name: section, exact: true })).toBeVisible();
    }
  });

  test('does not show a "Coming soon" placeholder', async ({ page }) => {
    await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  });

  test('has SEO metadata', async ({ page }) => {
    await expect(page).toHaveTitle(/API Documentation \| BettaPay/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /API Documentation/,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /REST API reference/,
    );
  });

  test('sidebar links jump to their section and mark it current', async ({ page }) => {
    await waitForHydration(page);

    const sidebar = page.getByRole('navigation', { name: 'Documentation' }).first();
    const link = sidebar.getByRole('link', { name: 'Settlements', exact: true });
    await link.click();

    await expect(page).toHaveURL(/#settlements$/);
    await expect(page.locator('#settlements')).toBeInViewport({ timeout: 15_000 });

    // The scroll spy should catch up and mark the link as current.
    await expect(link).toHaveAttribute('aria-current', 'location', { timeout: 15_000 });
  });

  test('renders the on-this-page table of contents on wide viewports', async ({ page }) => {
    await waitForHydration(page);

    const toc = page.getByRole('navigation', { name: /on this page/i });
    await expect(toc).toBeVisible();
    // It lists the sub-headings of the section currently being read.
    await expect(toc.getByRole('link').first()).toBeVisible();
  });
});

test.describe('Docs — mobile drawer', () => {
  test.use({ viewport: { width: 480, height: 900 } });

  test('opens from the hamburger and closes with Escape', async ({ page }) => {
    await page.goto('/docs');

    const drawer = page.getByRole('dialog', { name: /documentation navigation/i });
    // Closed drawer is aria-hidden and visibility:hidden, so it is absent from
    // the accessibility tree and its links are out of the tab order.
    await expect(drawer).toBeHidden();

    await retryUntil(
      () => page.getByRole('button', { name: /open documentation navigation/i }).click(),
      () => expect(drawer).toBeVisible({ timeout: 1500 }),
    );

    // Focus moves into the drawer for keyboard users.
    await expect(page.getByRole('button', { name: /close navigation/i })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});

test.describe('Docs — code blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/docs');
  });

  test('syntax highlighting is applied to code blocks', async ({ page }) => {
    // Shiki emits <pre class="shiki ..."> with per-token colour variables.
    await expect(page.locator('pre.shiki').first()).toBeVisible();
    expect(await page.locator('pre.shiki').count()).toBeGreaterThan(5);
  });

  test('request examples expose cURL, Node.js and Python tabs', async ({ page }) => {
    const tablist = page.getByRole('tablist').first();
    await expect(tablist.getByRole('tab', { name: 'cURL' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Node.js (fetch)' })).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Python' })).toBeVisible();
  });

  test('copy-to-clipboard writes the snippet to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await waitForHydration(page);

    const copyButton = page.getByRole('button', { name: /^copy/i }).first();

    await retryUntil(
      () => copyButton.click(),
      async () => {
        const clipboard = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboard.length).toBeGreaterThan(0);
      },
    );
  });
});

test.describe('Docs — keyboard accessibility', () => {
  test('the skip link moves focus to the main content', async ({ page }) => {
    await page.goto('/docs');

    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: /skip to main content/i });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });

  test('request example tabs are operable with arrow keys', async ({ page }) => {
    await page.goto('/docs');

    await waitForHydration(page);

    const tablist = page.getByRole('tablist').first();
    const curl = tablist.getByRole('tab', { name: 'cURL' });
    const nodeFetch = tablist.getByRole('tab', { name: 'Node.js (fetch)' });

    // Roving tabindex: only the active tab is in the tab order.
    await expect(curl).toHaveAttribute('aria-selected', 'true');
    await expect(nodeFetch).toHaveAttribute('tabindex', '-1');

    // Arrow keys move focus and selection together.
    await retryUntil(
      async () => {
        await curl.focus();
        await page.keyboard.press('ArrowRight');
      },
      () => expect(nodeFetch).toHaveAttribute('aria-selected', 'true', { timeout: 1500 }),
    );
    await expect(nodeFetch).toBeFocused();
    await expect(curl).toHaveAttribute('aria-selected', 'false');

    // Home returns to the first tab.
    await page.keyboard.press('Home');
    await expect(curl).toBeFocused();
    await expect(curl).toHaveAttribute('aria-selected', 'true');
  });

  test('collapsible endpoint sections toggle with the keyboard', async ({ page }) => {
    await page.goto('/docs');

    // Native <details>/<summary> — keyboard operable without any JS.
    const details = page.locator('details[data-docs-disclosure]').first();
    const summary = details.locator('summary').first();

    await summary.focus();
    await expect(summary).toBeFocused();

    const wasOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);

    await page.keyboard.press('Enter');
    await expect
      .poll(() => details.evaluate((el) => (el as HTMLDetailsElement).open))
      .toBe(!wasOpen);
  });
});
