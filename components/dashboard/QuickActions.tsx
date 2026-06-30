"use client";

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BarChart3, Wallet, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const actions = [
  { label: 'Create Payment Link', icon: Plus, href: '/payments', color: 'amber' },
  { label: 'View Transactions', icon: BarChart3, href: '/transactions', color: 'blue' },
  { label: 'Settle Funds', icon: Wallet, href: '/settlement', color: 'emerald' },
  { label: 'Check FX Rate', icon: RefreshCcw, href: '/fx', color: 'purple' },
];

const colorClasses: Record<string, { card: string; icon: string }> = {
  amber: { card: 'border-primary/30 bg-primary/10 hover:bg-primary/20', icon: 'text-primary' },
  blue: { card: 'border-blue-200 bg-blue-50 hover:bg-blue-100', icon: 'text-blue-600' },
  emerald: { card: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100', icon: 'text-emerald-600' },
  purple: { card: 'border-purple-200 bg-purple-50 hover:bg-purple-100', icon: 'text-purple-600' },
};

export function QuickActions() {
  return (
    <Card className="lg:col-span-3 border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 grid grid-cols-2 gap-3">
        {actions.map(({ label, icon: Icon, href, color }) => {
          const cc = colorClasses[color];
          return (
            <Link key={href} href={href}>
              <div className={cn('flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm', cc.card)}>
                <Icon className={cn('w-5 h-5', cc.icon)} />
                <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
