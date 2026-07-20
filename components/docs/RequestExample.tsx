"use client";

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { HighlightedSample } from '@/lib/docs/types';
import { CopyButton } from './CopyButton';

interface RequestExampleProps {
  /** Pre-highlighted samples (cURL, Node, Python, React, …), in tab order. */
  samples: HighlightedSample[];
}

/**
 * Tabbed, syntax-highlighted request examples. Implements the WAI-ARIA tabs
 * pattern: roving tabindex, arrow/Home/End navigation and correct
 * aria-selected / aria-controls wiring so it is fully keyboard operable.
 */
export function RequestExample({ samples }: RequestExampleProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (samples.length === 0) return null;

  const focusTab = (index: number) => {
    setActive(index);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab((active + 1) % samples.length);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab((active - 1 + samples.length) % samples.length);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(samples.length - 1);
        break;
      default:
        break;
    }
  };

  const current = samples[active];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center border-b border-border bg-muted/40 pr-1">
        <div
          role="tablist"
          aria-label="Request example language"
          className="flex flex-1 items-center gap-1 overflow-x-auto px-2"
        >
          {samples.map((sample, index) => (
            <button
              key={sample.language}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={handleKeyDown}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors',
                index === active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {sample.label}
            </button>
          ))}
        </div>
        <CopyButton value={current.code} label={`Copy ${current.label} example`} />
      </div>

      {samples.map((sample, index) => (
        <div
          key={sample.language}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={index !== active}
        >
          <div className="docs-code" dangerouslySetInnerHTML={{ __html: sample.html }} />
        </div>
      ))}
    </div>
  );
}
