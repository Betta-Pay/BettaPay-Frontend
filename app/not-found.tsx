"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store/authStore";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Home, ArrowLeft, LifeBuoy, Frown } from "lucide-react";

export default function NotFound() {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <MerchantSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-background/50 pb-20 md:pb-0">
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
                  <Link href="/dashboard">
                    <Button className="shadow-sm shadow-primary/20">
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <div className="flex flex-col items-center justify-center py-24 sm:py-32 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/10 border border-primary/30 dark:border-primary/30 flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
            404
          </h1>
          <p className="text-xl font-semibold text-foreground mb-2">
            Page not found
          </p>
          <p className="text-sm text-muted-foreground max-w-md mb-8">
            Sorry, we couldn&apos;t find the page you were looking for.
            It might have been removed or the URL may be incorrect.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/">
              <Button className="shadow-sm shadow-primary/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">
                <LifeBuoy className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-3 h-3 text-primary" />
          </div>
          <span className="font-semibold text-foreground">BettaPay</span>
        </div>
        <p>© 2026 BettaPay Inc. Built on Stellar · Non-custodial payments</p>
      </footer>
    </div>
  );
}
