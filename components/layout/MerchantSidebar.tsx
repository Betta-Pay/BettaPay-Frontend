"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { merchantNavItems } from "@/lib/navigation/merchantNav";
import { useAuthStore } from "@/lib/store/authStore";
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from "lucide-react";

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

  return (
    <aside
      id={SIDEBAR_ID}
      className={cn(
        "h-full flex-col bg-card border-r border-border hidden md:flex flex-shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Main navigation"
    >
      {/* Logo + collapse toggle */}
      <div className={cn("p-5 border-b border-border flex items-center", collapsed ? "justify-center px-2" : "justify-between gap-2")}>
        <Link href="/dashboard" className={cn("flex items-center gap-2.5 min-w-0", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1 shadow-sm flex-shrink-0">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight text-foreground truncate">
              BettaPay
            </span>
          )}
        </Link>
        {/* Desktop collapse toggle - communicates expanded state */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={SIDEBAR_ID}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Merchant menu">
        {merchantNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon as unknown as React.ComponentType<{ className?: string }>;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30 font-semibold shadow-sm amber:bg-amber-50"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium border border-transparent",
              )}
            >
              <span className="relative flex items-center flex-shrink-0">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                  aria-hidden="true"
                />
                {isActive && !collapsed && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                )}
              </span>
              {!collapsed && item.label}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer - hidden label when collapsed, but retains avatar */}
      <div className="p-4 border-t border-border">
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center px-0")}>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0" aria-hidden="true">
            {initials}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {displayName}
              </span>
              <span className={cn("text-xs flex items-center gap-1 font-medium", showVerified ? "text-success" : kyb.color)}>
                {showVerified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true"></span>
                )}
                {showVerified ? "Verified" : kyb.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
