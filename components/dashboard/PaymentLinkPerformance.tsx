"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { CreditCard, Copy, ExternalLink, ArrowRight } from 'lucide-react';

interface PaymentLink {
  id: string;
  label: string;
  url: string;
  clicks: number;
  converted: number;
}

interface PaymentLinkPerformanceProps {
  links: PaymentLink[];
  error: boolean;
  onRetry: () => void;
  onCopy: (url: string) => void;
}

export function PaymentLinkPerformance({ links, error, onRetry, onCopy }: PaymentLinkPerformanceProps) {
  return (
    <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">Payment Link Performance</CardTitle>
          <Link href="/payments">
            <Button variant="ghost" className="text-xs text-primary hover:text-primary hover:bg-primary/10 min-h-[44px] px-2 rounded-lg font-semibold">
              Manage <ArrowRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <div className="py-8">
            <ErrorDisplay message="Failed to load payment links" onRetry={onRetry} />
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const conversionRate = Math.round((link.converted / link.clicks) * 100);
              return (
                <Link
                  key={link.id}
                  href={`/payments/${link.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{link.label}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{link.url}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${conversionRate}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{conversionRate}%</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-foreground">{link.converted}</span>
                    <span className="text-xs text-muted-foreground">{link.clicks} clicks</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" aria-label="Copy payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopy(`https://${link.url}`); }}>
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Open payment link" className="min-h-[44px] min-w-[44px] rounded-lg" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`https://${link.url}`, '_blank'); }}>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
