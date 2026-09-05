import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsLayout } from '@/components/docs/DocsLayout';
import { docsSectionIds, findNavItem, findNavGroup } from '@/lib/docs/navigation';
import { Overview } from '@/components/docs/content/Overview';
import { Authentication } from '@/components/docs/content/Authentication';
import { Quickstart } from '@/components/docs/content/Quickstart';
import { Merchants } from '@/components/docs/content/Merchants';
import { Payments } from '@/components/docs/content/Payments';
import { Settlements } from '@/components/docs/content/Settlements';
import { FxRates } from '@/components/docs/content/FxRates';
import { WebhookEvents } from '@/components/docs/content/WebhookEvents';
import { ErrorCodes } from '@/components/docs/content/ErrorCodes';
import { HttpStatus } from '@/components/docs/content/HttpStatus';
import { WebhookIntegration } from '@/components/docs/content/WebhookIntegration';
import { IdempotencyKeys } from '@/components/docs/content/IdempotencyKeys';
import { TestingTestnet } from '@/components/docs/content/TestingTestnet';

// Registry mapping section ids to their content components.
// This is the single source of truth — the sidebar and TOC derive from the
// same `docsNavigation` array in `lib/docs/navigation.ts`.
const sectionComponents: Record<string, React.ComponentType> = {
  overview: Overview,
  authentication: Authentication,
  quickstart: Quickstart,
  merchants: Merchants,
  payments: Payments,
  settlements: Settlements,
  'fx-rates': FxRates,
  'webhook-events': WebhookEvents,
  'error-codes': ErrorCodes,
  'http-status': HttpStatus,
  'webhook-integration': WebhookIntegration,
  'idempotency-keys': IdempotencyKeys,
  'testing-testnet': TestingTestnet,
};

interface DocsSlugPageProps {
  params: Promise<{ slug: string[] }>;
}

export function generateStaticParams() {
  return docsSectionIds.map((id) => ({ slug: [id] }));
}

export async function generateMetadata({ params }: DocsSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const sectionId = slug[slug.length - 1];
  const item = findNavItem(sectionId);

  if (!item) {
    return { title: 'Not Found | BettaPay Docs' };
  }

  const group = findNavGroup(sectionId);
  const title = `${item.title} | BettaPay API Docs`;
  const description = `BettaPay API documentation: ${item.title}${group ? ` in ${group.title}` : ''}.`;

  return {
    title,
    description,
    alternates: { canonical: `/docs/${sectionId}` },
  };
}

export default async function DocsSlugPage({ params }: DocsSlugPageProps) {
  const { slug } = await params;
  const sectionId = slug[slug.length - 1];

  // Unknown slug → clean 404
  if (!docsSectionIds.includes(sectionId)) {
    notFound();
  }

  const ContentComponent = sectionComponents[sectionId];
  if (!ContentComponent) {
    notFound();
  }

  return (
    <DocsLayout>
      <ContentComponent />
    </DocsLayout>
  );
}
