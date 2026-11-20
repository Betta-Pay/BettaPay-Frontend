import { expect, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

/**
 * Mock authentication for the merchant/admin surfaces.
 *
 * The production login paths (Google OAuth, Freighter wallet signature) cannot
 * run headlessly in CI — there is no Google client, no browser extension, and
 * the backend challenge/verify endpoints are absent. What the app actually
 * gates on is far simpler: middleware only checks the `auth_token` + `user_role`
 * cookies, and the client store rehydrates the in-memory user from
 * `GET /api/auth/session` (a real Next.js route) when a persisted role is found.
 *
 * So a faithful, deterministic "mock login" is:
 *   1. Seed the persisted `role` in localStorage so `useSessionCheck` fires.
 *   2. POST to the real `/api/auth/session` route to set the auth cookies.
 * After that, protected routes load and the store's `user` (incl. `user.id`,
 * needed by the profile-save flow) is hydrated by the session GET.
 */

export type Role = 'merchant' | 'admin';

const AUTH_STORAGE_KEY = 'bp-session';
export const AUTH_STORAGE_STATE = path.join(process.cwd(), 'playwright', '.auth', 'merchant.json');

export async function mockLogin(context: BrowserContext, role: Role = 'merchant'): Promise<void> {
  // 1. Persist the minimal auth state zustand keeps on disk (only isLoggedIn per lib/store/authStore.ts:35).
  //    This aligns with lib/auth/session.ts BP_SESSION_KEY and triggers
  //    useSessionCheck to rehydrate the full user via GET /api/auth/session
  //    which reads auth_token + user_role cookies (same contract as middleware).
  await context.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* storage unavailable — ignore */
      }
    },
    [AUTH_STORAGE_KEY, JSON.stringify({ state: { isLoggedIn: true }, version: 0 })] as const,
  );

  // 2. Set the auth cookies via the real session route. The context's request
  //    client shares the cookie jar with the pages, so subsequent navigations
  //    are authenticated.
  const response = await context.request.post('/api/auth/session', {
    data: { token: 'e2e.mock.jwt', role },
  });
  expect(response.ok(), 'mock session cookie should be set').toBeTruthy();
}

/**
 * Navigate to a protected route as an authenticated user and wait for the
 * session to hydrate the in-memory store. Waiting for the session GET removes a
 * race for flows that read `user.id` (e.g. saving the profile) right after load.
 */
export async function gotoAuthed(page: Page, path: string): Promise<void> {
  const sessionHydrated = page
    .waitForResponse(
      (res) => res.url().includes('/api/auth/session') && res.request().method() === 'GET',
      { timeout: 15_000 },
    )
    .catch(() => null); // Already resolved / not needed — don't fail the navigation.
  await page.goto(path);
  await sessionHydrated;
}
