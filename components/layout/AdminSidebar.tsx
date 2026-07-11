"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Users, 
  ListOrdered, 
  Anchor, 
  RefreshCcw, 
  ShieldAlert, 
  Settings,
  ShieldCheck
} from 'lucide-react';

export const adminNavItems = [
  { href: '/overview', label: 'Platform Overview', icon: BarChart3 },
  { href: '/merchants', label: 'Merchants', icon: Users },
  { href: '/admin/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/anchors', label: 'Anchors (SEP-24)', icon: Anchor },
  { href: '/fx-management', label: 'FX Management', icon: RefreshCcw },
  { href: '/compliance', label: 'Compliance', icon: ShieldAlert },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

import Image from 'next/image';

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border hidden md:flex" role="navigation" aria-label="Main navigation">
      <div className="p-6">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight text-sidebar-foreground">BettaPay <span className="text-primary text-sm font-normal ml-1">ADMIN</span></span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {adminNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                isActive 
                  ? "bg-primary/10 text-sidebar-foreground font-semibold border border-primary/30 shadow-sm" 
                  : "text-muted-foreground hover:bg-sidebar-accent/20 hover:text-sidebar-foreground font-medium border border-transparent"
              )}
            >
              <div className="relative flex items-center">
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                )} />
                {isActive && (
                  <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
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
      </div>
    </aside>
  );
};
