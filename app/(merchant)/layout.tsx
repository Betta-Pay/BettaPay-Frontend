"use client";

import { useCallback, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { MerchantSidebar, merchantNavItems } from "@/components/layout/MerchantSidebar";
import { PageTransition } from "@/components/shared/PageTransition";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { Topbar } from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { useWalletStore } from "@/lib/store/walletStore";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const network = useWalletStore((s) => s.network);
  const isTestnet = network === 'testnet';

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    router.prefetch("/transactions");
    router.prefetch("/payments");
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MerchantSidebar />

      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        navItems={merchantNavItems}
      />

      <MobileBottomNav />

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

        <main className="flex-1 overflow-y-auto bg-background/50 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8 space-y-6">
            <OnboardingWizard />
            <PageTransition>{children}</PageTransition>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
