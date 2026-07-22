import { useEffect, useRef, useState } from 'react';

interface ScrollSpyOptions {
  /**
   * IntersectionObserver rootMargin. The default opens the detection band a
   * fixed 120px below the viewport top — clearing the sticky header and the
   * `scroll-mt-24` (96px) anchor offset. Without that gap, jumping to a section
   * leaves the *previous* section still clipping the top of the band, and since
   * we pick the first match in document order it would win and highlight the
   * wrong entry. A fixed pixel value (not a %) keeps this correct on short
   * viewports too.
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
  const { rootMargin = '-120px 0px -60% 0px' } = options;
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
