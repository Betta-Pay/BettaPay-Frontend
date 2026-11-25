import { renderHook, act } from '@testing-library/react';
import { useScrollSpy } from '../useScrollSpy';

/**
 * Regression coverage for issue #1162:
 *   - inline `ids` array literals must not recreate the IntersectionObserver,
 *   - switching to a new section list must move `activeId` to the new first id.
 */

type ObserverEntry = { target: { id: string }; isIntersecting: boolean };
type ObserverCallback = (entries: ObserverEntry[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  private callback: ObserverCallback;
  readonly observed: string[] = [];

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: { id: string }): void {
    this.observed.push(el.id);
  }

  unobserve(): void {
    /* no-op */
  }

  disconnect(): void {
    /* no-op */
  }

  emit(entries: { id: string; isIntersecting: boolean }[]): void {
    this.callback(entries.map((e) => ({ target: { id: e.id }, isIntersecting: e.isIntersecting })));
  }
}

const observerInstances = () => MockIntersectionObserver.instances;

describe('useScrollSpy (#1162)', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    document.body.innerHTML =
      '<div id="a"></div><div id="b"></div><div id="x"></div><div id="y"></div>';
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      MockIntersectionObserver;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('does not recreate the observer when a parent passes a fresh array literal with the same ids', () => {
    const { rerender } = renderHook(({ ids }: { ids: string[] }) => useScrollSpy(ids), {
      initialProps: { ids: ['a', 'b'] },
    });

    const createdAfterMount = observerInstances().length;
    expect(createdAfterMount).toBeGreaterThan(0);

    rerender({ ids: ['a', 'b'] });
    rerender({ ids: ['a', 'b'] });

    expect(observerInstances().length).toBe(createdAfterMount);
  });

  it('resets activeId to the new first id when the section list no longer contains the active id', () => {
    const { result, rerender } = renderHook(({ ids }: { ids: string[] }) => useScrollSpy(ids), {
      initialProps: { ids: ['a', 'b'] },
    });

    const latest = observerInstances()[observerInstances().length - 1];
    act(() => {
      latest.emit([{ id: 'b', isIntersecting: true }]);
    });
    expect(result.current).toBe('b');

    // Navigate to a page whose sections no longer include the previous active id.
    rerender({ ids: ['x', 'y'] });
    expect(result.current).toBe('x');
  });
});
