import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import RouteProgress from "@/components/layout/RouteProgress";

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
    jest.runOnlyPendingTimers();
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

    // Fast ramp then inching: the bar keeps moving on slow loads.
    jest.advanceTimersByTime(2500);
    expect(bar?.getAttribute("data-phase")).toBe("inching");

    // And it completes rather than sticking around forever.
    jest.advanceTimersByTime(500);
    expect(bar?.getAttribute("data-phase")).toBe("done");
  });

  it("restarts on back-to-back navigations without finishing first", () => {
    const { rerender } = render(<RouteProgress />);
    mockPathname.mockReturnValue("/payments");
    rerender(<RouteProgress />);
    jest.advanceTimersByTime(1000);

    mockPathname.mockReturnValue("/transactions");
    rerender(<RouteProgress />);
    const bar = document.body.querySelector('[data-testid="route-progress"]');
    expect(bar?.getAttribute("data-phase")).toBe("started");
  });
});
