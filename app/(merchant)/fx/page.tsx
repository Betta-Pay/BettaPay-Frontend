"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
  Input,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { ErrorBoundary, ErrorDisplay } from "@/components/shared";
import {
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Bell,
  BellRing,
  Trash2,
  Plus,
  ArrowRightLeft,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotify } from "@/lib/hooks/useNotify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRates } from "@/lib/api/hooks";
import {
  useRateAlertStore,
  type RateAlertChannel,
} from "@/lib/store/rateAlertStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";

const CHANNEL_LABELS: Record<RateAlertChannel, string> = {
  in_app: "In-app",
  email: "Email",
  webhook: "Webhook",
};

const FxRateChart = dynamic(() => import("@/components/charts/FxRateChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[240px] w-full rounded-xl" />,
});

export default function FxRatesPage() {
  const {
    primaryRate,
    isLoading: ratesLoading,
    refetch,
  } = useRates();
  const [lastRefresh] = useState("Just now");
  const [fxError, setFxError] = useState(false);
  const notify = useNotify();
  const {
    alerts,
    addAlert,
    toggleAlert,
    deleteAlert,
    markAlertTriggered,
    hydrateFromServer,
    evaluate,
  } = useRateAlertStore();

  const currentRate =
    typeof primaryRate === "number" && Number.isFinite(primaryRate)
      ? primaryRate
      : 1585;

  // Selected active chart pair
  const [activeChartPair, setActiveChartPair] = useState<"USDC/NGN" | "EURC/NGN">("USDC/NGN");

  // Restore alerts from the backend on boot
  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  // Evaluate alerts on rate update
  useEffect(() => {
    if (!currentRate || isNaN(currentRate)) return;
    if (alerts.length === 0) return;

    if (alerts.some((a) => a.synced && a.enabled)) {
      void evaluate("USDC/NGN", currentRate);
    }

    alerts.forEach((alert) => {
      if (alert.synced) return;
      if (!alert.enabled || alert.triggered) return;
      if (alert.pair !== "USDC/NGN") return;

      const isMet =
        (alert.condition === "above" && currentRate >= alert.target) ||
        (alert.condition === "below" && currentRate <= alert.target);

      if (isMet) {
        markAlertTriggered(alert.id);
        notify.info(
          `Rate alert met: ${alert.pair} is ${alert.condition} ₦${alert.target.toLocaleString()} (Current: ₦${currentRate.toLocaleString()})`
        );
      }
    });
  }, [currentRate, alerts, markAlertTriggered, notify, evaluate]);

  // Conversion calculator state
  const [convertAmount, setConvertAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USDC");
  const [isExecuting, setIsExecuting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  // Rate Alert states
  const [newPair, setNewPair] = useState("USDC/NGN");
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [newTarget, setNewTarget] = useState("1650");
  const [newRecurrence, setNewRecurrence] = useState<"once" | "recurring">("once");
  const [newChannels, setNewChannels] = useState<RateAlertChannel[]>(["in_app"]);

  // Auto-Execute Trigger Feature
  const [autoExecute, setAutoExecute] = useState(false);
  const [autoExecuteAmount, setAutoExecuteAmount] = useState("5000");

  const toggleChannel = (channel: RateAlertChannel) => {
    setNewChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const rawInput = parseFloat(convertAmount) || 0;
  const feePercent = 0.5;
  const spreadPercent = 0.15;
  const networkFeeXlm = 0.00001;
  const feeUsdc = rawInput * (feePercent / 100);
  const spreadUsdc = rawInput * (spreadPercent / 100);
  const netUsdc = Math.max(0, rawInput - feeUsdc);
  const estimatedOutputNgn = currentRate ? netUsdc * currentRate : 0;

  const handleExecuteConversion = () => {
    if (rawInput <= 0) {
      notify.error("Please enter a valid amount to convert");
      return;
    }
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setConversionSuccess(true);
      notify.success(
        `Successfully converted ${convertAmount} ${fromCurrency} to ₦${estimatedOutputNgn.toLocaleString(undefined, { maximumFractionDigits: 0 })} NGN`
      );
    }, 1000);
  };

  const handleCreateAlert = () => {
    if (!newTarget || isNaN(Number(newTarget))) {
      notify.error("Please enter a valid target rate");
      return;
    }
    if (newChannels.length === 0) {
      notify.error("Pick at least one delivery channel");
      return;
    }

    addAlert({
      pair: newPair,
      condition: newCondition,
      target: Number(newTarget),
      recurrence: newRecurrence,
      channels: newChannels,
    });

    if (autoExecute) {
      notify.success(
        `Alert created with Auto-Execute: Will automatically swap $${autoExecuteAmount} ${newPair.split("/")[0]} when rate ${newCondition} ₦${newTarget}`
      );
    } else {
      notify.success(
        newRecurrence === "recurring"
          ? "Recurring rate alert created"
          : "One-time rate alert created"
      );
    }

    setNewTarget("");
    setAutoExecute(false);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-widest text-primary uppercase font-mono">
              Soroban FX Protocol
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Live Stellar Oracle
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mt-1">
            FX & Real-Time Conversions
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-2xl">
            Institutional-grade crypto-to-fiat exchange rates, guaranteed settlement quotes, and automated target execution triggers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refetch}
            className="border-border rounded-xl h-9 px-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh Rates
          </Button>
          <Button
            variant="outline"
            className="border-border rounded-xl h-9 px-3.5 text-xs font-semibold text-muted-foreground"
            onClick={() => setFxError(!fxError)}
          >
            {fxError ? "Reset Feed" : "Simulate Error"}
          </Button>
        </div>
      </div>

      {fxError ? (
        <div className="py-12">
          <ErrorDisplay
            message="Failed to load real-time exchange rates"
            onRetry={() => setFxError(false)}
          />
        </div>
      ) : (
        <>
          {/* Primary Rate & Instant Conversion Studio */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Primary Market Card */}
            <Card className="lg:col-span-7 border border-primary/25 bg-gradient-to-br from-amber-50/70 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden">
              <CardContent className="p-6 relative space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Spot Rate · Stellar Anchor Feed
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                      Updated {lastRefresh}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-3">
                    {ratesLoading ? (
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-foreground animate-pulse">
                        Loading...
                      </p>
                    ) : (
                      <p className="text-4xl sm:text-5xl font-heading font-bold text-foreground tabular-nums tracking-tight">
                        ₦{currentRate.toLocaleString()}
                        <span className="text-lg font-sans font-normal text-muted-foreground ml-2">
                          / USDC
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* 24h High/Low and Trend stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block font-mono">
                      24h Change
                    </span>
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+1.64%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block font-mono">
                      24h High
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      ₦1,620.00
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground block font-mono">
                      24h Low
                    </span>
                    <span className="text-xs font-bold text-foreground font-mono">
                      ₦1,565.00
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instant Conversion & Fee Transparency Studio */}
            <Card className="lg:col-span-5 border border-border bg-card shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary" /> Instant FX Quote & Swap
                </CardTitle>
                <CardDescription>
                  Preview real-time rates with zero hidden spread
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">You Convert</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      className="h-11 border-input rounded-xl bg-muted/40 font-bold font-mono text-lg"
                    />
                    <Select
                      value={fromCurrency}
                      onValueChange={(val) => val && setFromCurrency(val)}
                    >
                      <SelectTrigger className="w-[110px] h-11 border-border rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="EURC">EURC</SelectItem>
                        <SelectItem value="XLM">XLM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Spot Oracle Rate</span>
                    <span className="font-semibold text-foreground font-mono">
                      ₦{currentRate.toLocaleString()} / {fromCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Anchor Protocol Fee ({feePercent}%)</span>
                    <span className="font-semibold text-foreground font-mono">
                      ${feeUsdc.toFixed(2)} {fromCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border/60">
                    <span>Estimated Receive</span>
                    <span className="text-primary text-sm font-mono">
                      ₦{estimatedOutputNgn.toLocaleString(undefined, { maximumFractionDigits: 0 })} NGN
                    </span>
                  </div>
                </div>

                {/* Guaranteed Exchange Rate Lock Window & Expandable Fee Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      data-testid="rate-lock-window"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    >
                      Rate locked for 30s
                    </span>
                    <button
                      type="button"
                      aria-expanded={showFeeBreakdown}
                      onClick={() => setShowFeeBreakdown((prev) => !prev)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {showFeeBreakdown ? "Hide Fee Breakdown" : "Fee Breakdown"}
                    </button>
                  </div>

                  {showFeeBreakdown && (
                    <div
                      data-testid="fee-breakdown-panel"
                      className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-1.5 text-xs"
                    >
                      <div className="flex justify-between text-muted-foreground">
                        <span>Network Fee (Stellar)</span>
                        <span className="font-mono font-semibold text-foreground">
                          {networkFeeXlm} XLM
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Platform Fee ({feePercent}%)</span>
                        <span className="font-mono font-semibold text-foreground" data-testid="breakdown-platform-fee">
                          ${feeUsdc.toFixed(2)} {fromCurrency}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Estimated Spread ({spreadPercent}%)</span>
                        <span className="font-mono font-semibold text-foreground" data-testid="breakdown-spread-fee">
                          ${spreadUsdc.toFixed(2)} {fromCurrency}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleExecuteConversion}
                  disabled={isExecuting || !currentRate}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl h-11 text-xs shadow-button"
                >
                  {isExecuting ? "Executing Soroban Swap..." : "Execute Conversion"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Chart & Market Pairs */}
          <div className="grid gap-6 lg:grid-cols-7">
            <Card className="lg:col-span-4 border border-border bg-card shadow-sm rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  {activeChartPair} &mdash; 7-Day Market Trend
                </CardTitle>
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveChartPair("USDC/NGN")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartPair === "USDC/NGN"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    USDC/NGN
                  </button>
                  <button
                    onClick={() => setActiveChartPair("EURC/NGN")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      activeChartPair === "EURC/NGN"
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    EURC/NGN
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <FxRateChart height={240} />
                </ErrorBoundary>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border border-border bg-card shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-foreground">
                  Cross-Border Anchor Pairs
                </CardTitle>
                <CardDescription>Live spreads on African payment corridors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { from: "USDC", to: "NGN", rate: "₦1,585.00", change: "+1.64%", trend: "up" },
                  { from: "EURC", to: "NGN", rate: "₦1,720.50", change: "+0.85%", trend: "up" },
                  { from: "USDC", to: "KES", rate: "KSh 132.40", change: "-0.22%", trend: "down" },
                  { from: "USDC", to: "GHS", rate: "GH₵ 15.60", change: "+0.15%", trend: "up" },
                ].map((pair) => (
                  <div
                    key={`${pair.from}-${pair.to}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary font-mono">
                        {pair.from}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {pair.from}/{pair.to}
                        </p>
                        <p className="text-[11px] font-mono text-muted-foreground">{pair.rate}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                        pair.trend === "up"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {pair.trend === "up" ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {pair.change}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 3. SET TARGET RATE ALERT & AUTO-EXECUTE TRIGGER STUDIO */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-border bg-card shadow-sm rounded-2xl h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Target Rate Alert &amp; Auto-Execute
            </CardTitle>
            <CardDescription>
              Receive alerts or automatically execute conversions when your target threshold is hit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Currency Pair</label>
                <Select value={newPair} onValueChange={(val) => val && setNewPair(val)}>
                  <SelectTrigger className="h-10 border-input rounded-xl bg-muted/40 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC/NGN">USDC/NGN</SelectItem>
                    <SelectItem value="EURC/NGN">EURC/NGN</SelectItem>
                    <SelectItem value="XLM/NGN">XLM/NGN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Condition</label>
                <Select
                  value={newCondition}
                  onValueChange={(val) => val && setNewCondition(val as "above" | "below")}
                >
                  <SelectTrigger className="h-10 border-input rounded-xl bg-muted/40 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Goes Above (≥)</SelectItem>
                    <SelectItem value="below">Goes Below (≤)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Trigger Rate (₦)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="e.g. 1650"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="h-10 pl-8 border-input rounded-xl bg-muted/40 font-mono text-sm font-bold"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₦
                </span>
              </div>
            </div>

            {/* Target Rate Auto-Execute Toggle Box */}
            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoExecute}
                  onChange={(e) => setAutoExecute(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" /> Auto-Execute Conversion
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Automatically convert when rate condition is met
                  </span>
                </div>
              </label>

              {autoExecute && (
                <div className="space-y-2 pt-2 border-t border-primary/20">
                  <label className="text-xs font-semibold text-foreground">Amount to Convert (USDC)</label>
                  <Input
                    type="number"
                    value={autoExecuteAmount}
                    onChange={(e) => setAutoExecuteAmount(e.target.value)}
                    className="h-9 border-input bg-card rounded-lg font-mono text-xs font-bold"
                    placeholder="5000"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Action: Convert ${autoExecuteAmount} USDC when rate {newCondition} ₦{newTarget || "1650"}/$
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Frequency</label>
                <Select
                  value={newRecurrence}
                  onValueChange={(v) => v && setNewRecurrence(v as "once" | "recurring")}
                >
                  <SelectTrigger className="h-10 border-input rounded-xl bg-muted/40 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notification Channels</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(Object.keys(CHANNEL_LABELS) as RateAlertChannel[]).map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      aria-pressed={newChannels.includes(channel)}
                      onClick={() => toggleChannel(channel)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors",
                        newChannels.includes(channel)
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {CHANNEL_LABELS[channel]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateAlert}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl h-10 font-semibold text-xs shadow-button"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {autoExecute ? "Set Auto-Execute Trigger" : "Create Rate Alert"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Alerts List */}
        <Card className="border border-border bg-card shadow-sm rounded-2xl h-full">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Active Monitoring Triggers
            </CardTitle>
            <CardDescription>Real-time alerts monitored by the Anchor engine</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No active rate alerts</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Configure alerts above to receive notifications or automate conversions on favorable rate spikes.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                      alert.triggered
                        ? "bg-amber-500/5 border-amber-500/30"
                        : alert.enabled
                        ? "bg-card border-border hover:border-border/80"
                        : "bg-muted border-transparent opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center",
                          alert.triggered
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : alert.enabled
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground font-mono">
                          {alert.pair} {alert.condition} ₦{alert.target.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {alert.recurrence === "recurring" ? "Recurring" : "One-time"} ·{" "}
                          {(alert.channels ?? ["in_app"])
                            .map((c) => CHANNEL_LABELS[c] ?? c)
                            .join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={alert.enabled ? "Disable alert" : "Enable alert"}
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => toggleAlert(alert.id)}
                      >
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete alert"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          deleteAlert(alert.id);
                          notify.info("Alert removed");
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={conversionSuccess} onOpenChange={setConversionSuccess}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle>Conversion Executed</DialogTitle>
            <DialogDescription>
              Converted {convertAmount} {fromCurrency} to ₦{estimatedOutputNgn.toLocaleString(undefined, { maximumFractionDigits: 0 })} NGN.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full bg-primary text-primary-foreground font-semibold" onClick={() => setConversionSuccess(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
