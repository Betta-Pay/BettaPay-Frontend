"use client";

import { useState } from 'react';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Topbar } from '@/components/layout/Topbar';
import Footer from '@/components/layout/Footer';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      {/* Mobile nav drawer would go here */}
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Platform Operations" />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto bg-background/50 target:outline-none target:ring-2 target:ring-amber-400"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
