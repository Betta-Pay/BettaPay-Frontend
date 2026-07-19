"use client";

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { findNavGroup, findNavItem } from '@/lib/docs/navigation';

interface DocsBreadcrumbsProps {
  /** Currently-active section id (from the scroll spy). */
  activeSection: string;
  className?: string;
}

/**
 * Breadcrumb trail derived from the same navigation tree the sidebar uses, e.g.
 * "Docs › API Reference › Payments". Updates as the reader scrolls.
 */
export function DocsBreadcrumbs({ activeSection, className }: DocsBreadcrumbsProps) {
  const group = findNavGroup(activeSection);
  const item = findNavItem(activeSection);

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      <a href="#overview" className="transition-colors hover:text-foreground">
        Docs
      </a>
      {group && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{group.title}</span>
        </>
      )}
      {item && (
        <>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground" aria-current="page">
            {item.title}
          </span>
        </>
      )}
    </nav>
  );
}
