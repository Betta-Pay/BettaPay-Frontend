"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MerchantSidebar } from "@/components/layout/MerchantSidebar";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { Topbar } from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

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
      />

      <MobileBottomNav />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
          isMenuOpen={mobileMenuOpen}
        />

        <main className="flex-1 overflow-y-auto bg-background/50 pb-20 md:pb-0">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
            {children}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}