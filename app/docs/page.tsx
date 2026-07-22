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

const title = 'API Documentation | BettaPay';
const description =
  'REST API reference for integrating BettaPay: authentication, merchants, payments, settlements, FX rates, webhooks and error handling — with cURL, Node.js and Python examples.';

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    'BettaPay API',
    'USDC payments API',
    'Stellar payments',
    'crypto payment gateway',
    'REST API documentation',
    'webhooks',
  ],
  alternates: { canonical: '/docs' },
  openGraph: {
    title,
    description,
    url: '/docs',
    siteName: 'BettaPay',
    type: 'article',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

// Sections render in the same order as `docsNavigation`, so the sidebar,
// scroll-spy and breadcrumbs all line up with the document.
export default function DocsPage() {
  return (
    <DocsLayout>
      {/* Single page-level h1; every section below is an h2. */}
      <header className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          BettaPay API Documentation
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Everything you need to accept USDC on Stellar and settle to fiat — authentication,
          every endpoint, webhooks, and error handling, with copy-paste examples in cURL, Node.js
          and Python.
        </p>
      </header>

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
