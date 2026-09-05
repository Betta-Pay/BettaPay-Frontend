"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { merchantNavItems } from '@/lib/navigation/merchantNav';
import { Menu } from 'lucide-react';

const MOBILE_HREFS = ['/dashboard', '/payments', '/transactions', '/wallet'] as const;

const mobileNavItems = MOBILE_HREFS.map((href) => {
  const item = merchantNavItems.find((n) => n.href === href)!;
  return { ...item, label: item.shortLabel || item.label };
});

// Routes where the payment-focused bottom bar should NOT appear.
// Settings and Developers are global/config surfaces, not primary payment actions.
// Auth/docs are outside the merchant layout but guard here defensively.
const HIDDEN_PREFIXES = ['/settings', '/developers', '/auth', '/docs', '/guides', '/onboarding', '/api'] as const;

// Only show on primary interactive surfaces (payment flows). Everything else hides the bar.
// This includes wallet, dashboard, payments, transactions (+ their sub-routes) and optionally settlement/fx.
// We explicitly hide settings/developers as called out in the issue.
function shouldShowBottomNav(pathname: string): boolean {
  // Hide if matches any hidden prefix
  for (const prefix of HIDDEN_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return false;
    }
  }
  // Show only on intended surfaces - keep limited to mobile primary + settlement/fx which are transactional
  // For now allow dashboard, payments, transactions, wallet, settlement, fx - hide everything else inside merchant
  const allowedPrefixes = ['/dashboard', '/payments', '/transactions', '/wallet', '/settlement', '/fx'];
  return allowedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

interface MobileBottomNavProps {
  onMoreClick?: () => void;
}

export const MobileBottomNav = ({ onMoreClick }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // Route-based visibility - hide outside intended interactive surface
  if (!shouldShowBottomNav(pathname)) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed bottom-0 md:hidden left-0 right-0 z-40 bg-card border-t border-border px-2 pt-2 flex items-center justify-around shadow-nav-bottom"
      // iOS safe-area: ensure content not clipped behind home indicator. Use env(safe-area-inset-bottom).
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon as unknown as React.ComponentType<{ className?: string }>;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              // transition-colors: only animate color/background, not layout properties.
              // motion-reduce:transition-none: fully suppress transition for users who
              // prefer reduced motion — active state becomes an instant swap.
              "flex flex-col items-center justify-center w-[68px] gap-1 py-1.5 rounded-lg transition-colors motion-reduce:transition-none",
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
            <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMoreClick}
        aria-label="More navigation options"
        aria-expanded={false}
        aria-controls="mobile-nav"
        className={cn(
          "flex flex-col items-center justify-center w-[68px] gap-1 py-1.5 rounded-lg transition-colors motion-reduce:transition-none text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Menu className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] font-medium tracking-tight">More</span>
      </button>
    </nav>
  );
};
