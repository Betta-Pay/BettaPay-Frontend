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
import { ROUTES } from '@/lib/navigation/routes';
import { CommandPalette } from '@/components/command/CommandPalette';
import { ThemePreferenceSync } from '@/components/layout/ThemePreferenceSync';

export default function AdminLayout({
import { redirect } from 'next/navigation';
import { requireRoleFromCookies } from '@/lib/auth/requireRole';
import { AdminShell } from '@/components/layout/AdminShell';

// The role check reads request cookies, so this layout must never be
// statically prerendered or cached across users.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate for every admin page (issue #776).
 *
 * The role is confirmed against the backend session for the `auth_token`
 * cookie before anything renders. Non-admins are redirected from the server,
 * so they never see a flash of admin UI and never download the admin shell —
 * even with JavaScript disabled. The middleware redirect is only a UX hint.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const check = await requireRoleFromCookies('admin');

  const isMerchant = mounted && role === 'merchant';

  useEffect(() => {
    if (isMerchant) {
      router.replace(ROUTES.DASHBOARD);
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
  if (!check.ok) {
    redirect(check.status === 401 ? '/auth/login' : '/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
