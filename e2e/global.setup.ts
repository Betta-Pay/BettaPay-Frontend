import { chromium, type FullConfig } from '@playwright/test';
import { mkdirSync } from 'fs';
import path from 'path';
import { mockLogin, AUTH_STORAGE_STATE } from './helpers/auth';

/** Authenticate once and persist the browser state for protected E2E suites. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = String(config.projects[0]?.use.baseURL ?? 'http://localhost:3000');
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  try {
    await mockLogin(context, 'merchant');
    const page = await context.newPage();
    const sessionHydrated = page
      .waitForResponse(
        (response) => response.url().includes('/api/auth/session') && response.request().method() === 'GET',
        { timeout: 15_000 },
      )
      .catch(() => undefined);
    await page.goto('/dashboard');
    await sessionHydrated;
    if (!page.url().includes('/dashboard')) {
      throw new Error(`E2E authentication setup did not reach /dashboard (ended at ${page.url()})`);
    }

    mkdirSync(path.dirname(AUTH_STORAGE_STATE), { recursive: true });
    await context.storageState({ path: AUTH_STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
