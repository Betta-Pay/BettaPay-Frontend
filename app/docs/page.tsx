import type { Metadata } from 'next';
import { DocsLayout } from '@/components/docs/DocsLayout';
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

export const metadata: Metadata = {
  title: 'API Documentation | BettaPay',
  description: 'REST API reference for integrating BettaPay payment processing.',
};

// Sections render in the same order as `docsNavigation`, so the sidebar,
// scroll-spy and breadcrumbs all line up with the document.
export default function DocsPage() {
  return (
    <DocsLayout>
      {/* Getting Started */}
      <Overview />
      <Authentication />
      <Quickstart />

      {/* API Reference */}
      <Merchants />
      <Payments />
      <Settlements />
      <FxRates />
      <WebhookEvents />

      {/* Error Reference */}
      <ErrorCodes />
      <HttpStatus />

      {/* Guides */}
      <WebhookIntegration />
      <IdempotencyKeys />
      <TestingTestnet />
    </DocsLayout>
  );
}
