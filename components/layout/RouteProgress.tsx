"use client";

import { useEffect, useState } from "react";
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

export default function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "started" | "inching" | "done">(
    "idle"
  );

  // Any navigation starts the bar. Keying on pathname means client-side
  // navigations (which do not remount this component) still trigger it.
  useEffect(() => {
    if (phase === "idle") return;
    // A new route while running: restart from "started".
    setPhase("started");
    const t1 = setTimeout(() => setPhase("inching"), STARTED_MS + INCHING_MS);
    const t2 = setTimeout(() => setPhase("done"), STARTED_MS + INCHING_MS + DONE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
