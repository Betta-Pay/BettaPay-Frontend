"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Banknote,
  ChevronRight,
  Download,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import { getStellarExplorerTxUrl } from '@/lib/utils/explorer';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { SettlementConfirmation } from '@/components/settlement/SettlementConfirmation';
import { StatCard } from '@/components/shared/StatCard';
import { memo } from 'react';
import { mockSettlements, type Settlement } from '@/lib/mock/settlements';

interface SettlementItemProps {
  settlement: Settlement;
}

const SettlementItem = memo(function SettlementItem({ settlement: s }: SettlementItemProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-border hover:bg-muted/50 transition-all">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{s.bank} · {s.accountNo}</p>
        <p className="text-xs text-muted-foreground">{s.date}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-foreground"><CurrencyDisplay amount={s.amount} /></p>
        <p className="text-xs text-muted-foreground">₦{s.amountNgn.toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={s.status as 'completed' | 'pending' | 'failed'} />
        {s.txHash && (
          <a
            href={getStellarExplorerTxUrl(s.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Stellar Explorer"
          >
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
});

export default function SettlementPage() {
  const [settlementsError, setSettlementsError] = useState(false);
  const isOnline = useOfflineStore((s) => s.isOnline);
  const [settlementOpen, setSettlementOpen] = useState(false);

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Finance</p>
          <h1 className="text-3xl font-bold text-foreground">Settlement</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Convert your USDC balance to Nigerian Naira and settle to your bank account.
          </p>
        </div>
        <NetworkTooltip show={!isOnline}>
          <Button
            disabled={!isOnline}
            aria-disabled={!isOnline}
            onClick={() => setSettlementOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-5 text-sm shadow-button"
          >
            <Banknote className="w-4 h-4 mr-2" />
            Initiate Settlement
          </Button>
        </NetworkTooltip>
        <Button 
          variant="outline" 
          className="rounded-xl h-10 px-5 text-sm font-semibold text-muted-foreground"
          onClick={() => setSettlementsError(!settlementsError)}
        >
          {settlementsError ? "Reset API" : "Simulate Error"}
        </Button>
      </div>

      <SettlementConfirmation
        isOpen={settlementOpen}
        onClose={() => setSettlementOpen(false)}
      />

      {/* Balance summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <StatCard
          title="Available to Settle"
          value={<CurrencyDisplay amount={12450.00} />}
          color="amber"
          trend={{ label: "≈ ₦19,297,500" }}
        />
        <StatCard
          title="Pending Settlement"
          value={<CurrencyDisplay amount={8200.50} />}
          trend={{ icon: Clock, label: "Processing", color: "text-primary" }}
        />
        <StatCard
          title="Total Settled (30d)"
          value={<CurrencyDisplay amount={38750.00} />}
          trend={{ icon: CheckCircle2, label: "All completed", color: "text-emerald-600" }}
        />
        <Card className="border border-border border-t-2 border-t-amber-200 bg-card shadow-sm">
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available to Settle</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 relative">
            <p className="text-xl sm:text-2xl font-bold text-foreground"><CurrencyDisplay amount={12450.00} /></p>
            <p className="text-xs text-muted-foreground mt-1">≈ ₦19,297,500</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Settlement</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl sm:text-2xl font-bold text-foreground"><CurrencyDisplay amount={8200.50} /></p>
            <p className="text-xs text-primary mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Processing</p>
          </CardContent>
        </Card>
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Settled (30d)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xl sm:text-2xl font-bold text-foreground"><CurrencyDisplay amount={38750.00} /></p>
            <p className="text-xs text-success mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> All completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement history */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">Settlement History</CardTitle>
            <CardDescription>All your past USDC → NGN conversions</CardDescription>
          </div>
          <NetworkTooltip show={!isOnline}>
            <Button
              variant="outline"
              disabled={!isOnline}
              aria-disabled={!isOnline}
              className="border-border text-muted-foreground rounded-xl text-xs h-8 px-3"
            >
              <Download className="w-3 h-3 mr-1.5" /> Export
            </Button>
          </NetworkTooltip>
        </CardHeader>
        <CardContent>
          {settlementsError ? (
            <div className="py-12">
              <ErrorDisplay
                message="Failed to load settlement history"
                onRetry={() => setSettlementsError(false)}
              />
            </div>
          ) : mockSettlements.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No settlements yet"
              description="Your USDC → NGN conversion history will appear here once you initiate a settlement."
            />
          ) : (
            <div className="space-y-3">
              {mockSettlements.map((s) => (
                <SettlementItem key={s.id} settlement={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank account config notice */}
      <Card className="border border-primary/30 bg-primary/10">
        <CardContent className="flex items-start gap-4 p-5">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Bank account not configured</p>
            <p className="text-xs text-primary mt-0.5">
              Add your Nigerian bank account in Settings to enable automatic settlements.
            </p>
          </div>
          <Button variant="ghost" className="text-primary hover:bg-primary/20 rounded-xl text-xs h-8 px-3 flex-shrink-0">
            Go to Settings <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
