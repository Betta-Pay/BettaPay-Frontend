/* eslint-disable @typescript-eslint/no-explicit-any */
declare let describe: any;
declare let it: any;
declare let expect: any;
declare let browser: any;

describe('Stellar Wave Merchant Page Scroll Preservation E2E Suite', () => {
  const isE2E = typeof browser !== 'undefined';

  (isE2E ? it : it.skip)(
    'should transition between long pages and accurately restore scroll position without jumps',
    async () => {
      // 1. Visit the primary long merchant dashboard page
      await browser.url('/merchant/dashboard');

      // 2. Scroll deeply down into table entries
      await browser.execute(() => window.scrollTo(0, 1500));
      const initialDepth = await browser.execute(() => window.scrollY);
      expect(initialDepth).toBe(1500);

      // 3. Navigate away via internal client-side link element
      const settingsTab = await browser.$('a[href="/merchant/settings"]');
      await settingsTab.click();

      // 4. Confirm alternative page starts cleanly at the top boundary
      const alternativeDepth = await browser.execute(() => window.scrollY);
      expect(alternativeDepth).toBe(0);

      // 5. Trigger a native history step backward
      await browser.back();

      // 6. Acceptance Criteria: Original depth is perfectly preserved with zero structural bouncing
      const restoredDepth = await browser.execute(() => window.scrollY);
      expect(restoredDepth).toBe(1500);
    }
  );
});

