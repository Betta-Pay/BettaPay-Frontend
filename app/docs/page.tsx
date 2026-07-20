import type { Metadata } from 'next';
import { DocsLayout } from '@/components/docs/DocsLayout';
import { docsSections } from '@/lib/docs/navigation';
import { SectionShell } from '@/components/docs/content/primitives';
import { Overview } from '@/components/docs/content/Overview';
import { Authentication } from '@/components/docs/content/Authentication';
import { Quickstart } from '@/components/docs/content/Quickstart';

export const metadata: Metadata = {
  title: 'API Documentation | BettaPay',
  description: 'REST API reference for integrating BettaPay payment processing.',
};

// Sections with dedicated content components. The rest render a lightweight
// placeholder so the sidebar, scroll-spy and anchor links resolve while later
// steps fill them in.
const BUILT = new Set(['overview', 'authentication', 'quickstart']);

export default function DocsPage() {
  return (
    <DocsLayout>
      <Overview />
      <Authentication />
      <Quickstart />

      {docsSections
        .filter((section) => !BUILT.has(section.id))
        .map((section) => (
          <SectionShell
            key={section.id}
            id={section.id}
            title={section.title}
            lead={`The ${section.title} reference is documented in the sections that follow.`}
          >
            <></>
          </SectionShell>
        ))}
    </DocsLayout>
  );
}
