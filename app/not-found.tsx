"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { getDefaultRoute } from "@/lib/utils";
import { ROUTES } from "@/lib/navigation/routes";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui";
import { Home, ArrowLeft, LifeBuoy, Frown } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Standalone 404 page.
 *
 * Renders a simple, self-contained "Page not found" screen for both
 * authenticated and unauthenticated users. Instead of duplicating
 * the merchant layout (MerchantSidebar + Topbar), the page adapts
 * its CTA buttons based on auth state so the user is always directed
 * to the most useful destination.
 *
 * In Next.js App Router, the root `not-found.tsx` is rendered inside
 * the root `layout.tsx`. Because the (merchant) group layout is only
 * applied to routes within that group, re-importing its sidebar/topbar
 * here would duplicate the layout structure without the actual layout
 * context. A standalone design avoids that duplication.
 */
export default function NotFound() {
  const { isAuthenticated, user } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    console.warn(`404: Page not found at ${pathname}`);
  }, [pathname]);

  if (isAuthenticated) {
    const isMerchant = user?.role !== "admin";

    return (
      <div className="flex h-screen overflow-hidden bg-background">
        {isMerchant ? <MerchantSidebar /> : <AdminSidebar />}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background/50 pb-20 md:pb-0">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 dark:bg-primary/10 border border-primary/30 dark:border-primary/30 flex items-center justify-center mb-6">
                  <Frown className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
                  404
                </h1>
                <p className="text-xl font-semibold text-foreground mb-2">
                  Page not found
                </p>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                  The page you&apos;re looking for doesn&apos;t exist or has been moved.
                  Check the URL or navigate back to your dashboard.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Link href={getDefaultRoute(user?.role)}>
                    <Button className="shadow-button">
                      <Home className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </Link>
                  <Link href="/settings">
                    <Button variant="outline">
                      <LifeBuoy className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="border-b border-border px-6 py-4">
        <Link href={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME} className="inline-flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-foreground">BettaPay</span>
        </Link>
      </header>

      {/* Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-6">
            <Frown className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
            404
          </h1>
          <p className="text-xl font-semibold text-foreground mb-2">
            Page not found
          </p>
          <p className="text-sm text-muted-foreground max-w-md mb-8">
            {isAuthenticated
              ? "The page you\u2019re looking for doesn\u2019t exist or has been moved. Check the URL or navigate back to your dashboard."
              : "Sorry, we couldn\u2019t find the page you were looking for. It might have been removed or the URL may be incorrect."}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href={ROUTES.DASHBOARD}>
                  <Button className="shadow-button">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline">
                    <LifeBuoy className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href={ROUTES.HOME}>
                  <Button className="shadow-button">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
                <Link href={ROUTES.LOGIN}>
                  <Button variant="outline">
                    <LifeBuoy className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center p-0.5">
            <Image src="/logo.png" alt="BettaPay Logo" width={16} height={16} className="w-full h-full object-contain" />
          </div>
          <span className="font-semibold text-foreground">BettaPay</span>
        </div>
        <p>&copy; 2026 BettaPay Inc. Built on Stellar &middot; Non-custodial payments</p>
      </footer>
    </div>
  );
}
