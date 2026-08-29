"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isMarketingRoute } from "@/lib/auth/session";
import { AppProviders } from "./AppProviders";

/**
 * Mounts the heavy `AppProviders` stack for every route except the static
 * marketing/documentation pages (`isMarketingRoute`). Those pages render their
 * children directly, so React Query, the auth/wallet stores and axios stay out
 * of the public bundle (issue #584).
 *
 * The route type is derived from `usePathname()`, which is stable between the
 * server render and hydration for a given URL, so there is no provider-tree
 * mismatch. Client navigation from a marketing page into the app mounts
 * `AppProviders` at that point.
 */
export function ConditionalAppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname && isMarketingRoute(pathname)) {
    return <>{children}</>;
  }

  return <AppProviders>{children}</AppProviders>;
}
