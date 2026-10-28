import type { NavGroup, NavItem } from './types';

// The documentation navigation tree — the single source of truth for the
// sidebar, the breadcrumb trail, the "current section" scroll-spy and every
// content section's heading (via `SectionShell` in `content/primitives.tsx`).
// Each `NavItem.id` doubles as the DOM id of that section on the page, so
// anchor links, the sidebar and the observer all agree without any
// duplicated lists.
//
// i18n note: the docs (this file and everything under `components/docs`) are
// English-only by design — not translated, and not wired into any i18n
// framework. Centralizing labels here means a future i18n pass has exactly
// one place to source strings from instead of hunting through every content
// component.

export const DOCS_BASE_URL = 'https://bettapay-backend.onrender.com';

export const docsNavigation: NavGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      { id: 'overview', title: 'Overview' },
      { id: 'authentication', title: 'Authentication' },
      { id: 'quickstart', title: 'Quickstart' },
    ],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    items: [
      { id: 'api-explorer', title: 'API Explorer', href: '/docs/api' },
      { id: 'merchants', title: 'Merchants' },
      { id: 'payments', title: 'Payments' },
      { id: 'settlements', title: 'Settlements' },
      { id: 'fx-rates', title: 'FX & Rates' },
      { id: 'webhook-events', title: 'Webhook Events' },
    ],
  },
  {
    id: 'error-reference',
    title: 'Error Reference',
    items: [
      { id: 'error-codes', title: 'Error Codes' },
      { id: 'http-status', title: 'HTTP Status' },
    ],
  },
  {
    id: 'guides',
    title: 'Guides',
    items: [
      { id: 'webhook-integration', title: 'Webhook Integration' },
      { id: 'idempotency-keys', title: 'Idempotency Keys' },
      { id: 'testing-testnet', title: 'Testing with Testnet' },
    ],
  },
];

/** Flat, in-order list of every item in the sidebar. */
export const docsNavItems: NavItem[] = docsNavigation.flatMap((group) => group.items);

/** In-page sections only (route links such as `/docs/api` are excluded). */
export const docsSections: NavItem[] = docsNavItems.filter((item) => !item.href);

/** Every section id, in document order. */
export const docsSectionIds: string[] = docsSections.map((item) => item.id);

/** Resolve the group that contains a given section id (used for breadcrumbs). */
export function findNavGroup(sectionId: string): NavGroup | undefined {
  return docsNavigation.find((group) =>
    group.items.some((item) => item.id === sectionId),
  );
}

/** Resolve a section's nav item by id. */
export function findNavItem(sectionId: string): NavItem | undefined {
  return docsNavItems.find((item) => item.id === sectionId);
}

/** Resolve a route-linked nav item (e.g. `/docs/api`) by its pathname. */
export function findNavItemByHref(href: string): NavItem | undefined {
  return docsNavItems.find((item) => item.href === href);
}
