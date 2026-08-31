"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import { useSessionCheck } from "@/lib/hooks/useSessionCheck";
import { useCrossTabAuth } from "@/lib/hooks/useCrossTabAuth";
import { useCrossTabRateLimit } from "@/lib/hooks/useCrossTabRateLimit";
import { setAppRouter } from "@/lib/navigation/appRouter";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { initRum } from "@/lib/rum";
import { initErrorReporting } from "@/lib/errorReporting";
import { useRouteChange } from "@/lib/rum/useRouteChange";
import { useHydrationCapture } from "@/lib/rum/useHydrationCapture";
import { isPublicRoute, isAuthRoute } from "@/lib/auth/session";

/**
 * The authenticated-app provider stack: React Query, session verification,
 * cross-tab auth/rate-limit sync, RUM + error reporting, and the offline
 * banner.
 *
 * This is mounted by `ConditionalAppProviders` for every route EXCEPT the
 * static marketing pages, so `@tanstack/react-query`, the auth/wallet stores
 * and axios never reach the public landing bundle (issue #584). `ThemeProvider`
 * is intentionally NOT here — it lives in the root layout so marketing pages
 * still get theming.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const restoreWalletSession = useWalletStore((s) => s.restoreSession);
  const refreshWalletBalances = useWalletStore((s) => s.refreshBalances);
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
          },
        },
      })
  );

  // Purge cached merchant data when the user logs out so the next account
  // never sees stale payment/settlement/rate/profile data from the previous
  // session.
  const wasAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      queryClient.clear();
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, queryClient]);

  const walletRestoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) {
      walletRestoreAttemptedRef.current = false;
      return;
    }
    if (walletRestoreAttemptedRef.current) return;
    walletRestoreAttemptedRef.current = true;
    void restoreWalletSession(true);
  }, [isAuthenticated, restoreWalletSession]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const wallet = useWalletStore.getState();
      if (useAuthStore.getState().isAuthenticated && wallet.isConnected) {
        void refreshWalletBalances();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refreshWalletBalances]);

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
      <OfflineBanner />
      {showFlashGuard ? (
        <div className="min-h-[60vh] flex items-center justify-center p-8" aria-busy="true" aria-live="polite">
          <div className="text-sm text-muted-foreground">Verifying session…</div>
        </div>
      ) : (
        children
      )}
    </QueryClientProvider>
  );
}
