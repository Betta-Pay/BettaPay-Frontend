"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

/**
 * A subtle route-transition progress bar pinned to the top of the viewport
 * (issue #736).
 *
 * Why this exists: the root `app/loading.tsx` used to render a full-screen
 * spinner as the default route-transition fallback. On anything faster than a
 * bad connection the spinner appears for a fraction of a second and the whole
 * page flashes white, which reads as jank even when nothing is wrong. The
 * localized `loading.tsx` skeletons inside each route segment are the right
 * granularity for slow loads; this bar covers the gap between navigation
 * start and the segment's own Suspense boundary taking over.
 *
 * Implementation notes:
 * - Pure CSS animation driven by two phases: a fast "started" ramp (reaches
 *   ~80% in 2s, ease-out so it never looks finished) and an "inching" phase
 *   after that, so a genuinely slow load shows movement instead of a lie.
 * - Portal into document.body so the bar renders above app chrome (sidebars,
 *   sticky headers) without any z-index coordination in layouts.
 * - `aria-hidden` on the visual bar; progress semantics belong to the
 *   localized skeletons' regions, and a duplicate live region would chatter
 *   for screen-reader users on every navigation.
 * - Disappears by completing (width -> 100% + fade), so a fast navigation
 *   shows a sweep, not a flash.
 */

const STARTED_MS = 200;
const INCHING_MS = 2000;
const DONE_MS = 400;

export const ROUTE_PROGRESS_START_EVENT = "route-progress:start";
export const ROUTE_PROGRESS_ABORT_EVENT = "route-progress:abort";

export function startRouteProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_START_EVENT));
  }
}

export function abortRouteProgress(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_ABORT_EVENT));
  }
}

export default function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "started" | "inching" | "done">(
    "idle"
  );
  // Skip the mount-time effect run — the initial route already rendered via
  // SSR/loading, so animating a bar there would flash on every hydration.
  const mounted = useRef(false);
  const inchingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (inchingTimerRef.current !== null) {
      clearTimeout(inchingTimerRef.current);
      inchingTimerRef.current = null;
    }
    if (doneTimerRef.current !== null) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }, []);

  const beginProgress = useCallback(() => {
    clearTimers();
    setPhase("started");
    inchingTimerRef.current = setTimeout(
      () => setPhase("inching"),
      STARTED_MS + INCHING_MS
    );
    doneTimerRef.current = setTimeout(
      () => setPhase("done"),
      STARTED_MS + INCHING_MS + DONE_MS
    );
  }, [clearTimers]);

  const completeAndHide = useCallback(() => {
    clearTimers();
    setPhase((current) => (current === "idle" ? "idle" : "done"));
  }, [clearTimers]);

  // Any navigation starts the bar. Keying on pathname means client-side
  // navigations (which do not remount this component) still trigger it.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // A new route while running: restart from "started".
    beginProgress();
    return () => {
      clearTimers();
    };
  }, [pathname, beginProgress, clearTimers]);

  // Listen for explicit start/abort signals, browser stop (Escape), or
  // aborted route fetches so the bar always reaches 100% and fades out.
  useEffect(() => {
    const handleStart = () => beginProgress();
    const handleAbort = () => completeAndHide();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        completeAndHide();
      }
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        typeof reason === "object" &&
        ("name" in reason && (reason as { name?: string }).name === "AbortError")
      ) {
        completeAndHide();
      }
    };

    window.addEventListener(ROUTE_PROGRESS_START_EVENT, handleStart);
    window.addEventListener(ROUTE_PROGRESS_ABORT_EVENT, handleAbort);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(ROUTE_PROGRESS_START_EVENT, handleStart);
      window.removeEventListener(ROUTE_PROGRESS_ABORT_EVENT, handleAbort);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [beginProgress, completeAndHide]);

  // "idle" renders nothing at all — not even the container — so the bar can
  // never affect layout or paint while no navigation is in flight.
  if (phase === "idle") return null;

  const width =
    phase === "done"
      ? 100
      : phase === "started"
      ? 80
      : 15;

  return createPortal(
    <div
      aria-hidden="true"
      data-testid="route-progress"
      data-phase={phase}
      className="fixed inset-x-0 top-0 z-[100] h-0.5 pointer-events-none"
    >
      <div
        className={
          phase === "inching"
            ? "h-full bg-primary transition-all duration-[2000ms] ease-in-out will-change-transform"
            : "h-full bg-primary transition-all duration-200 ease-out will-change-transform"
        }
        style={{ width: `${width}%`, opacity: phase === "done" ? 0 : 1 }}
      />
    </div>,
    document.body
  );
}
