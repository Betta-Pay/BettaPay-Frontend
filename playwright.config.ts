import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser Playwright configuration.
 *
 * All specs run on every engine to catch browser-specific regressions in:
 *   - CSS animations and transitions (WebKit/Safari)
 *   - WalletConnect modal behaviour (Firefox)
 *   - Clipboard, focus management, and keyboard navigation (all engines)
 *
 * Projects:
 *   chromium    – Desktop Chrome  (full suite)
 *   firefox     – Desktop Firefox (full suite)
 *   webkit      – Desktop Safari  (full suite)
 *   mobile-safari – iPhone 14 viewport (full suite, critical for responsive specs)
 *
 * CI strategy: each browser runs as a separate matrix job so all four execute
 * in parallel, keeping total wall-clock time close to a single-browser run.
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* In CI each browser is isolated to its own matrix job, so we can safely
   * use multiple workers inside that job for spec-level parallelism. */
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // ── Desktop browsers (full suite) ─────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // ── Mobile viewport (full suite, Safari engine) ───────────────────────
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Point the API client at the same origin so route mocks are same-origin
    // (no CORS) and payment-link URLs resolve to the running app.
    env: {
      NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    },
  },
});

