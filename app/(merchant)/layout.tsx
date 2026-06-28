"use client";

import { useCallback, useState } from 'react';
import { MerchantSidebar } from '@/components/layout/MerchantSidebar';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Topbar } from '@/components/layout/Topbar';
import Footer from '@/components/layout/Footer';

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MerchantSidebar />
      <MobileNavDrawer isOpen={mobileMenuOpen} onClose={closeMobileMenu} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen((o) => !o)} isMenuOpen={mobileMenuOpen} />
        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
