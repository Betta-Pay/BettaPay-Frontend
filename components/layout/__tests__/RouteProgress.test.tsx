import { act, fireEvent, render } from "@testing-library/react";
import { usePathname } from "next/navigation";
import RouteProgress, {
  abortRouteProgress,
  startRouteProgress,
} from "@/components/layout/RouteProgress";

// Issue #736 — the root route transition must not flash a full-screen
// spinner. These tests cover the replacement: a top progress bar that runs
// on navigation and disappears when done.

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// RouteProgress portals into document.body; render() already attaches there.
const mockPathname = usePathname as jest.Mock;

describe("RouteProgress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPathname.mockReturnValue("/overview");
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("renders nothing on first mount (idle)", () => {
    const { container } = render(<RouteProgress />);
    expect(container.querySelector('[data-testid="route-progress"]')).toBeNull();
    expect(document.body.querySelector('[data-testid="route-progress"]')).toBeNull();
  });

  it("starts the bar when the route changes and finishes it", () => {
    const { rerender } = render(<RouteProgress />);
    expect(document.body.querySelector('[data-testid="route-progress"]')).toBeNull();

    // Navigate: the bar appears at the top of the viewport.
    mockPathname.mockReturnValue("/payments");
    rerender(<RouteProgress />);
    const bar = document.body.querySelector('[data-testid="route-progress"]');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar?.getAttribute("data-phase")).toBe("started");

    // Fast ramp then inching: the bar keeps moving on slow loads. Timer
    // callbacks run outside React's batching, so advance inside act().
    act(() => jest.advanceTimersByTime(2500));
    expect(bar?.getAttribute("data-phase")).toBe("inching");

    // And it completes rather than sticking around forever.
    act(() => jest.advanceTimersByTime(500));
    expect(bar?.getAttribute("data-phase")).toBe("done");
  });

  it("restarts on back-to-back navigations without finishing first", () => {
    const { rerender } = render(<RouteProgress />);
    mockPathname.mockReturnValue("/payments");
    rerender(<RouteProgress />);
    act(() => jest.advanceTimersByTime(1000));

    mockPathname.mockReturnValue("/transactions");
    rerender(<RouteProgress />);
    const bar = document.body.querySelector('[data-testid="route-progress"]');
    expect(bar?.getAttribute("data-phase")).toBe("started");
  });

  it("completes to 100% width and opacity 0 when a route transition is cancelled or aborted", () => {
    const { rerender } = render(<RouteProgress />);
    mockPathname.mockReturnValue("/payments");
    rerender(<RouteProgress />);

    const bar = document.body.querySelector('[data-testid="route-progress"]');
    expect(bar?.getAttribute("data-phase")).toBe("started");

    act(() => {
      abortRouteProgress();
    });

    expect(bar?.getAttribute("data-phase")).toBe("done");
    const innerBar = bar?.firstElementChild as HTMLElement | null;
    expect(innerBar?.style.width).toBe("100%");
    expect(innerBar?.style.opacity).toBe("0");
  });

  it("does not leave orphaned progress bars on rapid cancellations and Escape stop", () => {
    render(<RouteProgress />);

    act(() => {
      startRouteProgress();
      startRouteProgress();
      startRouteProgress();
    });

    const bars = document.body.querySelectorAll('[data-testid="route-progress"]');
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute("data-phase")).toBe("started");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(bars[0].getAttribute("data-phase")).toBe("done");
    const innerBar = bars[0].firstElementChild as HTMLElement | null;
    expect(innerBar?.style.width).toBe("100%");
    expect(innerBar?.style.opacity).toBe("0");
  });
});
