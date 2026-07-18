'use client';

import { useEffect, useState } from 'react';

export type TocItem = {
  id: string;
  title: string;
  level?: 2 | 3;
};

export default function GuideTOC({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: [0, 1] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Guide table of contents" className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">On this page</p>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'pl-4' : undefined}>
            <a
              href={`#${item.id}`}
              className={`block rounded-lg px-3 py-2 transition-colors hover:bg-muted ${
                activeId === item.id ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground'
              }`}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
