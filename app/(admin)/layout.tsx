"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout';
import { adminNavItems } from '@/lib/navigation/adminNav';
import { PageTransition, ErrorBoundary } from '@/components/shared';
import { MobileNavDrawer } from '@/components/layout';
import { Topbar } from '@/components/layout';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/authStore';
import { CommandPalette } from '@/components/command/CommandPalette';
import { ThemePreferenceSync } from '@/components/layout/ThemePreferenceSync';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const role = useAuthStore((s) => s.role);

  // The persisted role only exists on the client, so the guard is deferred to
  // an effect. `mounted` keeps SSR and the first client render identical while
  // zustand rehydrates from storage — without it the layout would flash for
  // merchants who type an /admin URL directly, before middleware redirects.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isMerchant = mounted && role === 'merchant';

  useEffect(() => {
    if (isMerchant) {
      router.replace('/dashboard');
    }
  }, [isMerchant, router]);

  if (!mounted || isMerchant) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-screen items-center justify-center bg-background"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <ThemePreferenceSync />
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
        userFooter={
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground border border-border/30">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">System Admin</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Superuser
              </span>
            </div>
          </div>
        }
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} isMenuOpen={mobileMenuOpen} title="Platform Operations" />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-background/50">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-8">
            <PageTransition>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </PageTransition>
          </div>
        </main>
        <Footer />
      </div>

      <CommandPalette role="admin" />
    </div>
  );
}