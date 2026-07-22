import type { NavGroup, NavItem } from './types';

// The documentation navigation tree — the single source of truth for the
// sidebar, the breadcrumb trail and the "current section" scroll-spy. Each
// `NavItem.id` doubles as the DOM id of that section on the page, so anchor
// links, the sidebar and the observer all agree without any duplicated lists.

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

/** Flat, in-order list of every section for scroll-spy and prev/next logic. */
export const docsSections: NavItem[] = docsNavigation.flatMap((group) => group.items);

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
  return docsSections.find((item) => item.id === sectionId);
}
