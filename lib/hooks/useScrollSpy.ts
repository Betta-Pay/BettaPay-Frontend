import { useEffect, useRef, useState } from 'react';

export const DEFAULT_SCROLL_SPY_ROOT_MARGIN = '-120px 0px -60% 0px';

export interface ScrollSpyOptions {
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
  /** IntersectionObserver threshold(s) (default: 0). */
  threshold?: number | number[];
  /** Optional custom scroll container root (default: viewport). */
  root?: Element | Document | null;
}

/**
 * Tracks which of the given element ids is the "current" one while scrolling,
 * using a single IntersectionObserver (zero continuous `scroll` event listeners).
 * Powers the docs sidebar section highlight and the right-hand table of contents.
 *
 * Returns the active id (or the first id before any scrolling has happened).
 */
export function useScrollSpy(ids: string[], options: ScrollSpyOptions = {}): string {
  const {
    rootMargin = DEFAULT_SCROLL_SPY_ROOT_MARGIN,
    threshold = 0,
    root = null,
  } = options;
  const [activeId, setActiveId] = useState<string>(ids[0] ?? '');
  // Keep the last known set of intersecting ids across observer callbacks.
  const visible = useRef<Set<string>>(new Set());
  const idsKey = ids.join('\0');

  useEffect(() => {
    const orderedIds = idsKey.length > 0 ? idsKey.split('\0') : [];
    // Drop any ids left over from the previous `ids`/`rootMargin` — otherwise
    // a stale entry from the old observer can win the "first visible" pick
    // below before the new observer reports its own intersections.
    visible.current = new Set();

    setActiveId((prev) => (orderedIds.includes(prev) ? prev : orderedIds[0] ?? ''));

    if (orderedIds.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const elements = orderedIds
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
        const firstVisible = orderedIds.find((id) => visible.current.has(id));
        if (firstVisible) {
          setActiveId(firstVisible);
        }
      },
      { root, rootMargin, threshold },
    );

    elements.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      visible.current.clear();
    };
  }, [idsKey, root, rootMargin, threshold]);

  return activeId;
}
