/**
 * Route-change telemetry hook for RUM.
 *
 * Tracks client-side navigation timing using Next.js `usePathname` and
 * `useSearchParams`. Records route-change start/end duration as a RUM event.
 *
 * Avoids double-counting the initial navigation as a route change.
 */

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordRumEvent } from "./index";

export function useRouteChange() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const routeStart = useRef<number>(0);

  useEffect(() => {
    // Skip the initial render — initial navigation is tracked by
    // navigation timing collectors, not route-change tracking.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Record the end of the previous route and start timing for the new one
    const now = performance.now();

    if (routeStart.current > 0) {
      const duration = now - routeStart.current;
      recordRumEvent("route_change", duration, pathname ?? "/", {
        navigationType: "navigate",
      });
    }

    routeStart.current = now;
  }, [pathname]);
}
