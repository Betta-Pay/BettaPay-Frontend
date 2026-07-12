"use client";

import { useState } from 'react';
import { AdminSidebar, adminNavItems } from '@/components/layout/AdminSidebar';
import { PageTransition } from '@/components/shared/PageTransition';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';
import { Topbar } from '@/components/layout/Topbar';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navItems={adminNavItems}
        brandLabel="BettaPay ADMIN"
        logo={
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
              <Image src="/logo.png" alt="BettaPay Logo" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            BettaPay <span className="text-primary text-sm font-normal ml-0.5">ADMIN</span>
          </span>
        }
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} isMenuOpen={mobileMenuOpen} title="Platform Operations" />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background/50">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
