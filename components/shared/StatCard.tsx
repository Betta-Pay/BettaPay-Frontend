"use client";

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: {
    label: string;
    icon?: LucideIcon;
    color?: string;
  };
  color?: 'amber' | 'blue' | 'emerald' | 'purple' | 'primary';
  variant?: 'default' | 'destructive';
  className?: string;
}

const colorStyles = {
  amber: { gradient: 'from-primary/5', box: 'bg-primary/20', icon: 'text-primary' },
  blue: { gradient: 'from-info/5', box: 'bg-info/20', icon: 'text-info' },
  emerald: { gradient: 'from-success/5', box: 'bg-success/20', icon: 'text-success' },
  purple: { gradient: 'from-accent/5', box: 'bg-accent', icon: 'text-accent-foreground' },
  primary: { gradient: 'from-primary/5', box: 'bg-primary/10', icon: 'text-primary' },
} as const;

export function StatCard({ title, value, icon: Icon, trend, color, variant = 'default', className }: StatCardProps) {
  const isDestructive = variant === 'destructive';
  const cfg = color ? colorStyles[color] : null;

  return (
    <Card className={cn(
      "relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow",
      isDestructive ? "bg-destructive/10 border-destructive/20" : "bg-card border-border",
      className
    )}>
      {cfg && !isDestructive && (
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", cfg.gradient, "to-transparent")} />
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className={cn(
          "font-semibold",
          isDestructive
            ? "text-sm text-destructive"
            : "text-xs text-muted-foreground uppercase tracking-wider"
        )}>
          {title}
        </CardTitle>
        {Icon && (
          isDestructive ? (
            <Icon className="h-4 w-4 text-destructive" />
          ) : (
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg?.box)}>
              <Icon className={cn("h-4 w-4", cfg?.icon)} />
            </div>
          )
        )}
      </CardHeader>
      <CardContent className="p-3 sm:p-4 relative">
        <div className={cn(
          "text-xl sm:text-2xl font-bold",
          isDestructive ? "text-destructive" : "text-foreground"
        )}>
          {value}
        </div>
        {trend && (
          <p className={cn(
            "text-xs flex items-center mt-1.5 font-medium",
            trend.color || (isDestructive ? "text-destructive/80" : "text-muted-foreground")
          )}>
            {trend.icon && <trend.icon className="h-3 w-3 mr-1 shrink-0" />}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
