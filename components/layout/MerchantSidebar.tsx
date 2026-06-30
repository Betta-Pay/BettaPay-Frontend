"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Link as LinkIcon,
  ListOrdered,
  Wallet,
  RefreshCcw,
  Settings,
  Code2,
  ShieldCheck,
  Building2,
} from "lucide-react";

export const merchantNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/payments", label: "Payments", icon: LinkIcon },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/settlement", label: "Settlement", icon: Building2 },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/fx", label: "FX Rates", icon: RefreshCcw },
  { href: "/developers", label: "Developers", icon: Code2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MerchantSidebar = () => {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-64 flex-col bg-card border-r border-border hidden md:flex"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shadow-primary/20">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">
            BettaPay
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {merchantNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
            MC
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              Merchant Corp
            </span>
            <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              Verified
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
