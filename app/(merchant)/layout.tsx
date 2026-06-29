"use client";

import { useCallback, useState } from "react";
import { MerchantSidebar, merchantNavItems } from "@/components/layout/MerchantSidebar";
import { PageTransition } from "@/components/shared/PageTransition";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { Topbar } from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

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
