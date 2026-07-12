"use client";

import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  ExternalLink,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { useNotify } from "@/lib/hooks/useNotify";
import { ErrorDisplay } from "@/components/shared/ErrorDisplay";
import { useAuthStore } from "@/lib/store/authStore";
import { useWalletStore } from "@/lib/store/walletStore";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const WalletActivityHistory = dynamic(() => import('@/components/wallet/WalletActivityHistory').then(m => ({ default: m.WalletActivityHistory })), {
  loading: () => <Skeleton className="h-64 rounded-xl" />,
});

export default function WalletPage() {
  const { user } = useAuthStore();
  const { address: walletAddress, balances, loading, isReconnecting, error, refreshBalances } = useWalletStore();
  const { success } = useNotify();
  const [balancesError, setBalancesError] = useState(false);

  const address = walletAddress ?? user?.id ?? "";
  const shortAddress = address ? `${address.substring(0, 8)}...${address.slice(-6)}` : "";

  useEffect(() => {
    if (address) {
      refreshBalances();
    }
  }, [address, refreshBalances]);

  const handleCopy = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      success("Address copied");
    }
  }, [address, success]);

  const handleRefresh = useCallback(() => {
    refreshBalances();
  }, [refreshBalances]);

  const primaryBalance = balances.length > 0
    ? balances.reduce((max, b) => parseFloat(b.balance) > parseFloat(max.balance) ? b : max, balances[0])
    : null;

  if (balancesError) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">Stellar Wallet</p>
            <h1 className="text-3xl font-bold text-foreground">My Wallet</h1>
          </div>
          <Button variant="outline" className="text-xs" onClick={() => setBalancesError(false)}>
            Reset API
          </Button>
        </div>
        <div className="py-8">
          <ErrorDisplay
            message="Failed to load wallet balances"
            onRetry={() => setBalancesError(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
            Stellar Wallet
          </p>
          <h1 className="text-3xl font-bold text-foreground">My Wallet</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your non-custodial Stellar wallet for receiving crypto payments.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="text-xs"
          onClick={() => setBalancesError(true)}
        >
          Simulate Error
        </Button>
      </div>

      {/* Wallet Card */}
      <div className="relative rounded-2xl overflow-hidden bg-foreground p-4 sm:p-6 text-background shadow-surface-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full -ml-16 -mb-16 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-contain bg-background/10"
              />
              <span className="font-bold text-lg">BettaPay</span>
            </div>
            <span className="text-xs bg-background/10 px-3 py-1 rounded-full font-medium">
              Stellar Network
            </span>
          </div>

          {primaryBalance && !loading && (
            <div className="mb-6">
              <p className="text-xs text-background/50 uppercase tracking-wider mb-1">
                {primaryBalance.assetCode} Balance
              </p>
              <p className="text-4xl font-bold">
                {parseFloat(primaryBalance.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}{" "}
                <span className="text-lg font-normal text-background/60">{primaryBalance.assetCode}</span>
              </p>
            </div>
          )}

          {loading && (
            <div className="mb-6">
              <p className="text-xs text-background/50 uppercase tracking-wider mb-1">
                Loading...
              </p>
              <p className="text-4xl font-bold">
                <Skeleton className="h-10 w-48 bg-background/20 inline-block" />
              </p>
            </div>
          )}

          {!primaryBalance && !loading && (
            <div className="mb-6">
              <p className="text-xs text-background/50 uppercase tracking-wider mb-1">
                Wallet
              </p>
              <p className="text-2xl font-bold text-background/60">
                Multi-Asset Wallet
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-background/50 mb-1">Wallet Address</p>
              <p className="font-mono text-xs sm:text-sm text-background/80 break-all">{shortAddress || "Not connected"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                variant="ghost"
                aria-label="Copy wallet address"
                className="min-h-[44px] min-w-[44px] p-0 rounded-lg bg-background/10 hover:bg-background/20 text-primary-foreground"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <a
                href={`https://stellar.expert/explorer/testnet/account/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on Stellar Expert"
                className="min-h-[44px] min-w-[44px] p-0 rounded-lg bg-background/10 hover:bg-background/20 text-primary-foreground flex items-center justify-center transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Reconnecting Banner */}
      {isReconnecting && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 animate-pulse">
          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
          <span>Reconnecting... Retrying to fetch balances</span>
        </div>
      )}

      {/* Loading State */}
      {loading && balances.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorDisplay message={error} onRetry={handleRefresh} />
      )}

      {/* Empty State (unfunded account) */}
      {!loading && !error && balances.length === 0 && address && (
        <Card className="border border-border bg-card shadow-sm">
          <CardContent>
            <EmptyState
              icon={Wallet}
              title="No assets found"
              description="This account has no balances yet. Fund it with XLM or add a trustline to get started."
              action={{ label: "Refresh", onClick: handleRefresh }}
            />
          </CardContent>
        </Card>
      )}

      {/* Balances */}
      {!loading && balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((asset) => (
            <Card
              key={`${asset.assetCode}${asset.assetIssuer || ''}`}
              className="border border-border bg-card shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {asset.assetCode}
                    </p>
                    {asset.assetIssuer && (
                      <p className="text-xs text-muted-foreground break-all mt-0.5" title={asset.assetIssuer}>
                        Issuer: {asset.assetIssuer.substring(0, 8)}...{asset.assetIssuer.slice(-6)}
                      </p>
                    )}
                  </div>
                  {asset.assetCode === 'USDC' && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
                      Stable
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {parseFloat(asset.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No address / not connected */}
      {!address && (
        <EmptyState
          icon={Wallet}
          title="No wallet connected"
          description="Connect a Stellar wallet to view your balances."
        />
      )}

      {/* Transaction history */}
      <WalletActivityHistory />
    </div>
  );
}
