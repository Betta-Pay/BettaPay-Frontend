"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ErrorDisplay, CurrencyDisplay, EmptyState } from "@/components/shared";
import { CreditCard, Copy, ExternalLink, ArrowRight } from "lucide-react";
import { usePayments } from "@/lib/api/hooks";
import { useNotify } from "@/lib/hooks/useNotify";

export function PaymentLinkPerformance() {
  const { data: payments, isLoading, error, refetch } = usePayments();
  const notify = useNotify();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.success("Copied to clipboard");
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const displayLinks = payments.slice(0, 5);

  return (
    <Card className="lg:col-span-4 border border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground">
            Payment Link Performance
          </CardTitle>
          <Link href="/payments">
            <Button
              variant="ghost"
              className="text-xs text-primary hover:text-primary hover:bg-primary/10 min-h-[44px] px-2 rounded-lg font-semibold"
            >
              Manage <ArrowRight className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="py-8">
            <ErrorDisplay message={error} onRetry={refetch} />
          </div>
        ) : displayLinks.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={CreditCard}
              title="No payment links yet"
              description="Create your first payment link to start accepting payments"
              action={{
                label: "Create Payment Link",
                onClick: () => {
                  window.location.href = "/payments";
                  if (typeof window !== 'undefined') {
                    window.location.href = "/payments";
                  }
                },
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {displayLinks.map((link) => {
              const linkUrl = `${baseUrl}/pay/${link.id}`;
              const clicks = link.clicks ?? 0;
              const converted = link.converted ?? 0;
              const conversionRate =
                clicks > 0 ? (converted / clicks) * 100 : 0;
              const rateLabel =
                clicks > 0 ? `${conversionRate.toFixed(0)}%` : "No data";

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
                    <p className="text-sm font-semibold text-foreground truncate">
                      {link.source ?? "Payment Link"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {linkUrl}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        {clicks > 0 && (
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${conversionRate}%` }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {rateLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-foreground">
                      <CurrencyDisplay
                        amount={link.amountUsdc}
                        currency="USDC"
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {clicks} clicks
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Copy payment link"
                      className="min-h-[44px] min-w-[44px] rounded-lg"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCopy(linkUrl);
                      }}
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open payment link"
                      className="min-h-[44px] min-w-[44px] rounded-lg"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(linkUrl, "_blank");
                      }}
                    >
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
