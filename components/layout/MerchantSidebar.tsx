"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { merchantNavItems } from "@/lib/navigation/merchantNav";
import { ROUTES } from "@/lib/navigation/routes";
import { useAuthStore } from "@/lib/store/authStore";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "bettapay:sidebar:merchant:collapsed";
const SIDEBAR_ID = "merchant-sidebar";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const KYB_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: "Verified", color: "text-success" },
  pending: { label: "Pending Review", color: "text-warning" },
  rejected: { label: "Rejected", color: "text-destructive" },
  none: { label: "Not Verified", color: "text-muted-foreground" },
};

export const MerchantSidebar = () => {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  const businessName = user?.businessName ?? user?.name ?? "";
  const initials = businessName ? getInitials(businessName) : "MC";
  const displayName = businessName || "Merchant Corp";
  const kyb = KYB_STATUS_LABEL[user?.kybStatus ?? "none"] ?? KYB_STATUS_LABEL.none;
  const showVerified = user?.kybStatus === "approved" || !isLoggedIn;

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate collapsed state from localStorage (per-role persistence)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {
      // ignore storage errors (e.g., private mode)
    }
    setMounted(true);
  }, []);

  // Persist collapsed preference
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed, mounted]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  return (
    <TooltipProvider>
      <aside
        id={SIDEBAR_ID}
        className={cn(
          "h-full flex-col bg-card border-r border-border hidden md:flex flex-shrink-0 transition-all duration-300 ease-in-out select-none relative",
          collapsed ? "w-16" : "w-64"
        )}
        aria-label="Main navigation"
      >
        {/* Logo + collapse toggle */}
        <div
          className={cn(
            "p-4 border-b border-border flex items-center",
            collapsed ? "justify-center px-2" : "justify-between gap-2"
          )}
        >
          <Link
            href={ROUTES.DASHBOARD}
            className={cn(
              "flex items-center gap-2.5 min-w-0 group",
              collapsed && "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center p-1 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="BettaPay Logo"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-bold text-lg tracking-tight text-foreground truncate">
                  BettaPay
                </span>
                <span className="text-[10px] text-muted-foreground font-sans tracking-wide uppercase font-semibold">
                  Merchant Rail
                </span>
              </div>
            )}
          </Link>
          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={SIDEBAR_ID}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Navigation list */}
        <nav
          className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto"
          aria-label="Merchant menu"
        >
          {merchantNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname ?? "").startsWith(item.href + "/");
            const Icon = item.icon as unknown as React.ComponentType<{
              className?: string;
            }>;

            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary/10 text-primary text-amber-500 font-semibold border border-primary/25 border-amber-500/25 shadow-[0_0_12px_rgba(240,165,0,0.12)]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
                )}
              >
                <span className="relative flex items-center flex-shrink-0">
                  <Icon
                    className={cn(
                      "w-4 h-4 transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  />
                  {isActive && !collapsed && (
                    <span
                      className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {collapsed && <span className="sr-only">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger render={<span className="block w-full">{navLink}</span>} />
                  <TooltipContent side="right" className="font-medium text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        {/* Keyboard shortcut hint when expanded */}
        {!collapsed && (
          <div className="px-4 py-2 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Toggle sidebar</span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono font-medium">
              ⌘B
            </kbd>
          </div>
        )}

        {/* User footer */}
        <div className="p-3 border-t border-border bg-card">
          <div
            className={cn(
              "flex items-center gap-3 px-2 py-1.5 rounded-lg",
              collapsed && "justify-center px-0"
            )}
          >
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 shadow-xs"
              aria-hidden="true"
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {displayName}
                </span>
                <span
                  className={cn(
                    "text-[11px] flex items-center gap-1 font-medium",
                    showVerified ? "text-success" : kyb.color
                  )}
                >
                  {showVerified && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                  {showVerified ? "Verified" : kyb.label}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
};
