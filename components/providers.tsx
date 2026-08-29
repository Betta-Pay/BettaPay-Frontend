"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionCheck } from "@/lib/hooks/useSessionCheck";
import { useCrossTabAuth } from "@/lib/hooks/useCrossTabAuth";
import { useCrossTabRateLimit } from "@/lib/hooks/useCrossTabRateLimit";
import { setAppRouter } from "@/lib/navigation/appRouter";
import { OfflineBanner } from "@/components/ui";
import { initRum } from "@/lib/rum";
import { initErrorReporting } from "@/lib/errorReporting";
import { useRouteChange } from "@/lib/rum/useRouteChange";
import { useHydrationCapture } from "@/lib/rum/useHydrationCapture";
import { isPublicRoute, isAuthRoute } from "@/lib/auth/session";
import { ServiceWorkerRegistration } from "@/components/ui/service-worker-registration";
import { triggerSync } from "@/lib/offline/syncQueue";

export function Providers({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  // Register the App Router in a module-level singleton so non-React code
  // (e.g. the axios auth interceptor) can navigate with router.push instead of
  // a full-page reload. Clear it on unmount to avoid holding a stale router.
  useEffect(() => {
    setAppRouter(router);
    return () => setAppRouter(null);
  }, [router]);

  // SSR-safe lazy initialisation keeps a stable QueryClient per browser
  // session while making sure each server render starts with its own
  // instance (preventing cross-request cache bleed).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30s of staleness keeps API hook consumers responsive without
            // re-hitting the network on every component re-mount or route
            // navigation. Data is silently refetched in the background.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
            // OfflineFirst lets queries fire while the browser reports being
            // offline so the service worker can answer them from its
            // stale-while-revalidate cache; without this, React Query would
            // short-circuit on navigator.onLine before the SW gets a chance.
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  // Purge cached merchant data when the user logs out so the next account
  // never sees stale payment/settlement/rate/profile data from the previous
  // session. The service worker's API cache holds the same data for offline
  // use, so ask it to drop those responses too.
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      queryClient.clear();
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
      }
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

  // Initialize RUM collection once per browser session
  useEffect(() => {
    const cleanup = initRum();
    return cleanup;
  }, []);

  // Install global handlers for uncaught errors and unhandled rejections.
  useEffect(() => {
    const cleanup = initErrorReporting();
    return cleanup;
  }, []);

  useRouteChange();
  useHydrationCapture();
  const { isVerifying } = useSessionCheck();
  useCrossTabAuth();

  // Replay offline-queued mutations (payment links, webhook tests) the moment
  // the browser reports connectivity again. The service worker also drains on
  // its own `online`/`sync` events; this is the deterministic client fallback.
  useEffect(() => {
    const handleOnline = () => {
      void triggerSync();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
  const pathname = usePathname();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  // Prevent flash of protected page for logged-out users (fix #575):
  // when we have a persisted isLoggedIn but no in-memory auth, hook is
  // re-verifying via GET /api/auth/session — same contract as middleware's
  // getSessionFromCookies/isSessionValid on auth_token+user_role. Hold
  // protected content until the check settles.
  const isProtectedRoute = Boolean(pathname && !isPublicRoute(pathname) && !isAuthRoute(pathname));
  const showFlashGuard = isVerifying && !isAuthenticated && isLoggedIn && isProtectedRoute;
  useCrossTabRateLimit();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        <ServiceWorkerRegistration />
        <OfflineBanner />
        {showFlashGuard ? (
          <div className="min-h-[60vh] flex items-center justify-center p-8" aria-busy="true" aria-live="polite">
            <div className="text-sm text-muted-foreground">Verifying session…</div>
          </div>
        ) : (
          children
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
