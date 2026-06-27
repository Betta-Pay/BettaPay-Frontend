"use client";

import { useState } from 'react';
import { MerchantSidebar } from '@/components/layout/MerchantSidebar';
import { Topbar } from '@/components/layout/Topbar';
import Footer from '@/components/layout/Footer';

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <MerchantSidebar />
      {/* Mobile nav drawer would go here, driven by mobileMenuOpen */}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} isMenuOpen={mobileMenuOpen} />
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
