import { renderHook, act } from '@testing-library/react';
import { useScrollSpy, DEFAULT_SCROLL_SPY_ROOT_MARGIN } from '../useScrollSpy';

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: ObserverCallback;
  options: IntersectionObserverInit | undefined;
  observedElements: Element[] = [];
  disconnected = false;

  constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observedElements.push(element);
  }

  unobserve(element: Element): void {
    this.observedElements = this.observedElements.filter((el) => el !== element);
  }

  disconnect(): void {
    this.disconnected = true;
    this.observedElements = [];
  }

  trigger(entries: Array<{ id: string; isIntersecting: boolean }>): void {
    this.callback(
      entries.map(({ id, isIntersecting }) => ({
        target: document.getElementById(id) ?? ({ id } as unknown as Element),
        isIntersecting,
      })),
    );
  }
}

describe('useScrollSpy (#904)', () => {
  const originalIntersectionObserver = global.IntersectionObserver;

  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    global.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
    document.body.innerHTML = `
      <section id="overview"></section>
      <section id="authentication"></section>
      <section id="webhooks"></section>
    `;
  });

  afterEach(() => {
    global.IntersectionObserver = originalIntersectionObserver;
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('observes headings via IntersectionObserver without registering scroll event listeners', () => {
    const windowAddSpy = jest.spyOn(window, 'addEventListener');
    const docAddSpy = jest.spyOn(document, 'addEventListener');

    const { result, unmount } = renderHook(() =>
      useScrollSpy(['overview', 'authentication', 'webhooks']),
    );

    expect(result.current).toBe('overview');
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const observer = MockIntersectionObserver.instances[0];
    expect(observer.options?.rootMargin).toBe(DEFAULT_SCROLL_SPY_ROOT_MARGIN);
    expect(observer.observedElements.map((el) => el.id)).toEqual([
      'overview',
      'authentication',
      'webhooks',
    ]);

    const scrollListeners = [
      ...windowAddSpy.mock.calls,
      ...docAddSpy.mock.calls,
    ].filter(([event]) => event === 'scroll');
    expect(scrollListeners).toHaveLength(0);

    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it('updates active heading in document order as sections intersect and exit', () => {
    const { result } = renderHook(() =>
      useScrollSpy(['overview', 'authentication', 'webhooks']),
    );

    const observer = MockIntersectionObserver.instances[0];

    act(() => {
      observer.trigger([
        { id: 'overview', isIntersecting: false },
        { id: 'authentication', isIntersecting: true },
        { id: 'webhooks', isIntersecting: true },
      ]);
    });

    // Document order prefers `authentication` while both are visible
    expect(result.current).toBe('authentication');

    act(() => {
      observer.trigger([{ id: 'authentication', isIntersecting: false }]);
    });

    expect(result.current).toBe('webhooks');
  });

  it('does not recreate IntersectionObserver when re-rendered with an equivalent inline ids array', () => {
    const { rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useScrollSpy(ids),
      { initialProps: { ids: ['overview', 'authentication'] } },
    );

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    rerender({ ids: ['overview', 'authentication'] });
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });
});
