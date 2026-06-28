"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Link as LinkIcon, 
  ListOrdered, 
  Wallet, 
  RefreshCcw, 
  Settings, 
  Code2,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/payments', label: 'Payments', icon: LinkIcon },
  { href: '/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/settlement', label: 'Settlement', icon: Building2 },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/fx', label: 'FX Rates', icon: RefreshCcw },
  { href: '/developers', label: 'Developers', icon: Code2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const MerchantSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-white border-r border-slate-100 hidden md:flex" aria-label="Primary">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shadow-amber-200">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">BettaPay</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              <Icon className={cn("w-4.5 h-4.5", isActive ? "text-amber-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            MC
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate">Merchant Corp</span>
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
