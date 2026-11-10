/**
 * Named viewport presets used by the responsive specs. Keeping them in one
 * place means the breakpoints the app cares about (Tailwind's `md` = 768px,
 * `lg` = 1024px) are asserted consistently across tests.
 */
export const VIEWPORTS = {
  /** Compact mobile viewport — iPhone SE (375x667). */
  mobileCompact: { width: 375, height: 667 },
  /** Below Tailwind `md` — mobile drawer + bottom nav are active (iPhone 12: 390x844). */
  mobile: { width: 390, height: 844 },
  /** Between `md` and `lg` — sidebar visible, top search still hidden. */
  tablet: { width: 820, height: 1180 },
  /** At/above `lg` — full desktop chrome. */
  desktop: { width: 1440, height: 900 },
} as const;

export const MOBILE_CHECKOUT_VIEWPORTS = [
  { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  { name: 'iPhone 12 (390x844)', width: 390, height: 844 },
] as const;

export type ViewportName = keyof typeof VIEWPORTS;
