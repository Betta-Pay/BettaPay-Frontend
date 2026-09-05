"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/store/authStore';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  brandLabel?: string;
  logo?: React.ReactNode;
  userFooter?: React.ReactNode;
}

export const MobileNavDrawer = ({
  isOpen,
  onClose,
  navItems,
  brandLabel = 'BettaPay',
  logo,
  userFooter,
}: MobileNavDrawerProps) => {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close the drawer automatically when pathname changes (route change)
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname, isOpen, onClose]);

  // Lock scroll when open, focus close button
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Trap focus inside the drawer & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content panel - overlay-with-scrim pattern below md (sidebar width) */}
      <div
        ref={drawerRef}
        id="mobile-nav"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border shadow-surface-xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border flex-shrink-0">
          {logo ? (
            logo
          ) : (
            <span className="font-bold text-xl tracking-tight text-sidebar-foreground">
              {brandLabel}
            </span>
          )}
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground min-h-[44px] min-w-[44px]"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon as unknown as React.ComponentType<{ className?: string }>;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-h-[44px]",
                  isActive
                    ? "bg-primary/10 text-sidebar-foreground font-semibold border border-primary/30 shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground font-medium border border-transparent"
                )}
              >
                <div className="relative flex items-center">
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {isActive && (
                    <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer section */}
        {userFooter && (
          <div className="p-4 border-t border-sidebar-border mt-auto flex-shrink-0">
            {userFooter}
          </div>
        )}
        <UserProfileFooter onClose={onClose} />
      </div>
    </>
  );
};

interface UserProfileFooterProps {
  onClose: () => void;
}

function UserProfileFooter({ onClose }: UserProfileFooterProps) {
  const user = useAuthStore((s) => s.user);

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';
  const avatarSrc = user?.avatarUrl?.trim() || undefined;

  return (
    <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-sidebar-border">
          {avatarSrc ? <AvatarImage src={avatarSrc} alt={user?.name ?? 'User'} /> : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">
            {user?.name ?? 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email ?? 'user@example.com'}
          </p>
        </div>
      </div>

      <Link
        href="/settings"
        onClick={onClose}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px]",
          "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground"
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </Link>
    </div>
  );
}
