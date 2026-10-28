import type { Metadata } from 'next';
import { DocsLayout } from '@/components/docs/DocsLayout';
import { ApiExplorer } from '@/components/docs/ApiExplorer';
import { openApiDocument } from '@/lib/docs/openapi';
import { buildExplorerModel } from '@/lib/docs/openapi-explorer';

const title = 'API Explorer | BettaPay';
const description =
  'Interactive, OpenAPI-driven reference for the BettaPay API: browse every endpoint, inspect schemas and send authenticated requests from your browser.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/docs/api' },
  openGraph: {
    title,
    description,
    url: '/docs/api',
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

export default function ApiExplorerPage() {
  const model = buildExplorerModel(openApiDocument);

  return (
    <DocsLayout>
      <section id="api-explorer">
        <ApiExplorer model={model} />
      </section>
    </DocsLayout>
  );
}
