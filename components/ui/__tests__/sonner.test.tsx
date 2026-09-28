/**
 * Responsive toast anchoring in the app-level `Toaster` (issue #733): on mobile
 * toasts must not sit on top of the fixed `MobileBottomNav`, and on desktop the
 * established bottom-right placement must be preserved.
 */
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { Toaster } from "../sonner";

/** Viewport query the component uses, and whether it currently matches. */
const MOBILE_QUERY_FRAGMENT = "max-width: 639px";
let mobileViewport = false;
let viewportListeners: ((event: MediaQueryListEvent) => void)[] = [];

const installMatchMedia = () => {
  viewportListeners = [];
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.includes(MOBILE_QUERY_FRAGMENT) ? mobileViewport : false;
    },
    media: query,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      viewportListeners.push(listener);
    },
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as unknown as typeof window.matchMedia;
};

/**
 * The `<ol>` sonner renders, carrying the resolved position and offsets. Sonner
 * only mounts it once there is something to show, and defers the first paint
 * through a timer, so every assertion waits for it to appear.
 */
const toaster = () => document.querySelector("[data-sonner-toaster]");

const showToast = async () => {
  act(() => {
    toast("Saved", { duration: Infinity });
  });
  await waitFor(() => expect(toaster()).toBeInTheDocument());
};

const setViewportWidth = (matches: boolean) => {
  act(() => {
    mobileViewport = matches;
    viewportListeners.forEach((listener) =>
      listener({ matches } as MediaQueryListEvent),
    );
  });
};

const clearToasts = async () => {
  act(() => {
    toast.dismiss();
  });
  await waitFor(() => expect(toaster()).not.toBeInTheDocument());
};

describe("Toaster responsive positioning (#733)", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    installMatchMedia();
  });

  afterEach(async () => {
    // Sonner's toast store is a module singleton, so leftovers would leak the
    // position of one test into the next.
    await clearToasts();
    window.matchMedia = originalMatchMedia;
  });

  it("anchors toasts to the bottom-right on desktop viewports", async () => {
    mobileViewport = false;
    render(<Toaster />);
    await showToast();

    expect(toaster()).toHaveAttribute("data-y-position", "bottom");
    expect(toaster()).toHaveAttribute("data-x-position", "right");
  });

  it("anchors toasts to the top-center on mobile viewports so the bottom nav stays clear", async () => {
    mobileViewport = true;
    render(<Toaster />);
    await showToast();

    expect(toaster()).toHaveAttribute("data-y-position", "top");
    expect(toaster()).toHaveAttribute("data-x-position", "center");
  });

  it("offsets the mobile position clear of the sticky 4rem app header", async () => {
    mobileViewport = true;
    render(<Toaster />);
    await showToast();

    const style = toaster()?.getAttribute("style") ?? "";
    // Both variables are required: sonner switches to `--mobile-offset-*` below
    // 600px and would otherwise ignore `offset` on small phones.
    expect(style).toContain("--offset-top");
    expect(style).toContain("--mobile-offset-top");
    expect(style).toContain("4rem");
    expect(style).toContain("safe-area-inset-top");
  });

  it("leaves the desktop offset at sonner's default", async () => {
    mobileViewport = false;
    render(<Toaster />);
    await showToast();

    const style = toaster()?.getAttribute("style") ?? "";
    expect(style).toContain("--offset-bottom");
    expect(style).not.toContain("safe-area-inset-top");
  });

  it("re-anchors when the viewport crosses the breakpoint", async () => {
    mobileViewport = false;
    render(<Toaster />);
    await showToast();
    expect(toaster()).toHaveAttribute("data-y-position", "bottom");

    setViewportWidth(true);
    expect(toaster()).toHaveAttribute("data-y-position", "top");

    setViewportWidth(false);
    expect(toaster()).toHaveAttribute("data-y-position", "bottom");
  });

  it("lets an explicit position prop win over the responsive default", async () => {
    mobileViewport = true;
    render(<Toaster position="top-right" />);
    await showToast();

    expect(toaster()).toHaveAttribute("data-y-position", "top");
    expect(toaster()).toHaveAttribute("data-x-position", "right");
  });
});
