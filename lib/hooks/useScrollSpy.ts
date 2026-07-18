import { useEffect, useRef, useState } from 'react';

interface ScrollSpyOptions {
  /**
   * IntersectionObserver rootMargin. The default activates a target as it
   * crosses the upper third of the viewport rather than the very top, which
   * feels natural when reading top-to-bottom.
   */
  rootMargin?: string;
}

/**
 * Tracks which of the given element ids is the "current" one while scrolling,
 * using a single IntersectionObserver. Powers the docs sidebar section
 * highlight and the right-hand table of contents.
 *
 * Returns the active id (or the first id before any scrolling has happened).
 */
export function useScrollSpy(ids: string[], options: ScrollSpyOptions = {}): string {
  const { rootMargin = '-10% 0px -70% 0px' } = options;
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');
  // Keep the last known set of intersecting ids across observer callbacks.
  const visible = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.current.add(entry.target.id);
          else visible.current.delete(entry.target.id);
        }

        // Choose the first id (in document order) that is currently visible.
        const firstVisible = ids.find((id) => visible.current.has(id));
        if (firstVisible) {
          setActiveId(firstVisible);
        }
      },
      { rootMargin, threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // `ids` is a stable reference from module-level data; re-run only if it changes.
  }, [ids, rootMargin]);

  return activeId;
}
