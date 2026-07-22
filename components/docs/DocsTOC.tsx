"use client";

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useScrollSpy } from '@/lib/hooks/useScrollSpy';

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface DocsTOCProps {
  /** Currently-active top-level section id (from the scroll spy). */
  activeSection: string;
}

/**
 * Right-hand mini table of contents (desktop ≥ xl only). Shows the H2/H3
 * headings inside the currently-active section and highlights the heading the
 * reader is on, using its own scroll spy over those heading ids.
 */
export function DocsTOC({ activeSection }: DocsTOCProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);

  // Re-scan the active section's sub-headings whenever it changes.
  useEffect(() => {
    const section = document.getElementById(activeSection);
    if (!section) {
      setHeadings([]);
      return;
    }
    const nodes = Array.from(
      section.querySelectorAll<HTMLElement>('h2[id], h3[id]'),
    );
    setHeadings(
      nodes.map((node) => ({
        id: node.id,
        text: node.textContent ?? '',
        level: node.tagName === 'H2' ? 2 : 3,
      })),
    );
  }, [activeSection]);

  const headingIds = useMemo(() => headings.map((h) => h.id), [headings]);
  const activeHeading = useScrollSpy(headingIds, { rootMargin: '0px 0px -75% 0px' });

  // Always reserve the column so the content width doesn't jump between sections.
  if (headings.length === 0) {
    return <div className="hidden w-56 shrink-0 xl:block" aria-hidden="true" />;
  }

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <nav
        aria-labelledby="docs-toc-heading"
        className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-8"
      >
        <p
          id="docs-toc-heading"
          className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          On this page
        </p>
        <ul className="space-y-1 border-l border-border">
          {headings.map((heading) => {
            const active = heading.id === activeHeading;
            return (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className={cn(
                    '-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors',
                    heading.level === 3 && 'pl-6',
                    active
                      ? 'border-primary font-medium text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
