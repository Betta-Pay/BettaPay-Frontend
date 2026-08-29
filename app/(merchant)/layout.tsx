"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { MerchantSidebar, MobileNavDrawer, Topbar, MobileBottomNav } from "@/components/layout";
import { merchantNavItems } from "@/lib/navigation/merchantNav";
import { PageTransition, ErrorBoundary } from "@/components/shared";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useWalletStore } from "@/lib/store/walletStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";
import { useRateLimitCountdown } from "@/lib/hooks/useRateLimitCountdown";
import { SessionTimeoutModal } from "@/components/SessionTimeoutModal";
import { CommandPalette } from "@/components/command/CommandPalette";
import { InstallPrompt } from "@/components/layout/InstallPrompt";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const network = useWalletStore((s) => s.network);
  const isTestnet = network === 'testnet';
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const handleTimeoutLogout = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  const { showWarning, secondsRemaining, isExtending, extendSession } = useSessionTimeout({
    onTimeout: handleTimeoutLogout,
  });

  useRateLimitCountdown();

  const handleExtend = useCallback(async () => {
    const success = await extendSession();
    if (!success) {
      logout();
      router.push('/auth/login');
    }
  }, [logout, router, extendSession]);

  // Prefetch only the two most likely next destinations on mount.
  // All other routes are prefetched lazily on hover/focus via Next.js Link
  // components, so no eager bundle downloads on initial load.
  useEffect(() => {
    try {
      router.prefetch("/dashboard");
      router.prefetch("/payments");
    } catch {
      // Prefetch may throw during SSR or in edge environments
    }
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MerchantSidebar />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        navItems={merchantNavItems}
        userFooter={
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
              MC
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                Merchant Corp
              </span>
              <span className="text-xs text-success flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block text-emerald-500"></span>
                Verified
              </span>
            </div>
          </div>
        }
      />

      <MobileBottomNav onMoreClick={() => setMobileMenuOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isTestnet && (
          <div className="bg-yellow-400/90 dark:bg-yellow-500/90 px-4 py-2 text-center text-xs sm:text-sm font-medium text-yellow-950 flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>You are on Stellar Testnet &mdash; transactions use test tokens</span>
          </div>
        )}

        <Topbar
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
          isMenuOpen={mobileMenuOpen}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background/50 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8 space-y-6">
            <OnboardingWizard />
            <PageTransition>
              <ErrorBoundary>{children}</ErrorBoundary>
            </PageTransition>
          </div>
        </main>
      </div>

      <CommandPalette role="merchant" />

      <InstallPrompt />

      {isAuthenticated && (
        <SessionTimeoutModal
          open={showWarning}
          secondsRemaining={secondsRemaining}
          isExtending={isExtending}
          onExtend={handleExtend}
          onLogout={handleTimeoutLogout}
        />
      )}
    </div>
  );
}
