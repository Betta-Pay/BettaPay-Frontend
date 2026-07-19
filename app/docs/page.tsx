import type { Metadata } from 'next';
import { DocsLayout } from '@/components/docs/DocsLayout';
import { docsSections } from '@/lib/docs/navigation';

export const metadata: Metadata = {
  title: 'API Documentation | BettaPay',
  description: 'REST API reference for integrating BettaPay payment processing.',
};

export default function DocsPage() {
  return (
    <DocsLayout>
      {docsSections.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-24 border-b border-border pb-16 pt-12 first:pt-0 last:border-0"
        >
          {index === 0 ? (
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {section.title}
            </h1>
          ) : (
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {section.title}
            </h2>
          )}
          <p className="mt-4 leading-relaxed text-muted-foreground">
            The {section.title} reference is documented in the sections that follow.
          </p>
        </section>
      ))}
    </DocsLayout>
  );
}
