"use client";

/**
 * Root route-transition fallback (issue #736).
 *
 * This used to be a full-screen spinner, which flashed on every fast
 * navigation before a segment's localized Suspense boundary could take over.
 * It is now deliberately empty: the subtle route progress bar
 * (`components/layout/RouteProgress.tsx`, mounted in the root layout) covers
 * the transition visually, and each segment's own `loading.tsx` skeleton
 * (admin, merchant, auth) covers genuinely slow loads at the right
 * granularity. Next.js requires this file to exist once an `app/` segment
 * defines one, but nothing says it has to block the whole viewport.
 *
 * It renders a fixed-size, visually empty element rather than `null` so the
 * server-rendered and client-rendered markup agree (hydration stability) and
 * the outgoing page stays paintable until the incoming segment's boundary
 * replaces this fallback.
 */
export default function RootLoading() {
  return <div aria-hidden="true" className="h-0" />;
}
