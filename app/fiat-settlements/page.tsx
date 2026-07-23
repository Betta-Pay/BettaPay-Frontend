import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Banknote,
  Zap,
  ShieldCheck,
  Percent,
  ArrowRight,
  Building2,
  Globe,
  Coins,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fiat Settlements | BettaPay',
  description: 'Auto-convert USDC to local fiat currencies automatically and instantly via Stellar SEP-24 compliant anchors directly into bank accounts.',
  openGraph: {
    title: 'Fiat Settlements — BettaPay',
    description: 'Direct-to-bank fiat settlements powered by Stellar SEP-24 anchor networks.',
    type: 'website',
  },
};

const ANCHORS = [
  { country: 'Nigeria', flag: '🇳🇬', currency: 'NGN', anchor: 'Cowrie Integrated', kyc: 'Level 1-3', time: 'Instant (< 2 mins)' },
  { country: 'European Union', flag: '🇪🇺', currency: 'EUR', anchor: 'Tempo Payments', kyc: 'Level 2', time: '10–30 mins' },
  { country: 'United States', flag: '🇺🇸', currency: 'USD', anchor: 'MoneyGram Stellar', kyc: 'Level 2', time: 'Instant' },
  { country: 'Brazil', flag: '🇧🇷', currency: 'BRL', anchor: 'Yellow Card Financial', kyc: 'Level 1', time: 'Instant (< 5 mins)' },
  { country: 'Kenya', flag: '🇰🇪', currency: 'KES', anchor: 'AZA Finance / BitPesa', kyc: 'Level 1-2', time: '15–30 mins' },
  { country: 'South Africa', flag: '🇿🇦', currency: 'ZAR', anchor: 'Clickatell / Anchorage', kyc: 'Level 2', time: 'Instant' },
];

const SUPPORTED_ASSETS = [
  { code: 'USDC', name: 'USD Coin', type: 'Stablecoin (Circle)', icon: '$' },
  { code: 'XLM', name: 'Stellar Lumens', type: 'Native Utility Asset', icon: '✦' },
  { code: 'Custom Assets', name: 'Stellar Tokens', type: 'Any SEP-24 Trustline Token', icon: '⚙' },
];

const BENEFITS = [
  {
    icon: Lock,
    title: '100% Non-Custodial',
    description: 'You maintain full control of your private keys until conversion executes directly on-chain.',
  },
  {
    icon: Zap,
    title: 'Instant Execution',
    description: 'Automated settlement pipelines process cross-border payouts in under 2 minutes.',
  },
  {
    icon: Percent,
    title: 'Transparent Low Fees',
    description: 'Zero hidden FX markups. Clear 0.5% flat settlement rate with live market prices.',
  },
  {
    icon: ShieldCheck,
    title: 'No Middlemen',
    description: 'Direct bank payouts eliminating correspondent banking delays and wire transfer hold-ups.',
  },
];

export default function FiatSettlementsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 via-background to-background py-16 md:py-24 px-6 border-b border-border/60">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-6">
            <Banknote className="w-4 h-4" />
            SEP-24 Stellar Anchor Integration
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight mb-6">
            Convert crypto to fiat — <span className="text-primary">automatically, instantly</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
            Accept USDC payments globally and let BettaPay automatically route funds through licensed SEP-24 anchors directly to your local bank account.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button size="lg" className="w-full sm:w-auto font-semibold px-8 rounded-xl h-12 text-base shadow-lg shadow-primary/20">
                Configure in Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold px-6 rounded-xl h-12 text-base border-border">
                Explore SEP-24 Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Flow Diagram */}
      <section className="py-16 px-6 bg-card border-b border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
              How Automatic Settlement Works
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              End-to-end payment lifecycle from customer wallet to local bank transfer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-background border border-border flex flex-col items-center text-center shadow-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">USDC Customer Pay</h3>
              <p className="text-xs text-muted-foreground">Customer completes checkout using USDC on Stellar network.</p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-background border border-border flex flex-col items-center text-center shadow-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">BettaPay Smart Route</h3>
              <p className="text-xs text-muted-foreground">BettaPay automatically calculates rate & routes to best local anchor.</p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-background border border-border flex flex-col items-center text-center shadow-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">SEP-24 Anchor Swap</h3>
              <p className="text-xs text-muted-foreground">Licensed anchor accepts USDC and converts to local fiat.</p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-background border border-border flex flex-col items-center text-center shadow-sm hover:border-primary/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg mb-4">
                4
              </div>
              <h3 className="font-bold text-base text-foreground mb-2">Bank Account Payout</h3>
              <p className="text-xs text-muted-foreground">Local currency deposited directly into merchant&apos;s bank account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Anchor Table Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              <Globe className="w-3.5 h-3.5" />
              Global Coverage
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Supported Fiat Anchors & Corridors
            </h2>
          </div>
          <p className="text-xs text-muted-foreground max-w-md">
            All anchors operate under full compliance with local regulatory frameworks and SEP-24 specifications.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-4 px-6 font-semibold">Country</th>
                  <th className="py-4 px-6 font-semibold">Currency</th>
                  <th className="py-4 px-6 font-semibold">Licensed Anchor</th>
                  <th className="py-4 px-6 font-semibold">KYC Level</th>
                  <th className="py-4 px-6 font-semibold">Settlement Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ANCHORS.map((row) => (
                  <tr key={row.currency} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground flex items-center gap-3">
                      <span className="text-xl">{row.flag}</span>
                      {row.country}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-primary">{row.currency}</td>
                    <td className="py-4 px-6 text-foreground font-medium">{row.anchor}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                        {row.kyc}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-emerald-600 dark:text-emerald-400">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Supported Assets & Benefits Grid */}
      <section className="py-16 px-6 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto space-y-16">
          
          {/* Assets */}
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-primary" /> Supported Digital Assets
              </h2>
              <p className="text-xs text-muted-foreground">Multi-asset trustline compatibility for seamless conversion.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUPPORTED_ASSETS.map((asset) => (
                <div key={asset.code} className="p-6 rounded-2xl bg-card border border-border shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                    {asset.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">{asset.code}</h3>
                    <p className="text-xs font-medium text-primary">{asset.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{asset.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-2">Why BettaPay Fiat Settlements?</h2>
              <p className="text-xs text-muted-foreground">Enterprise-ready settlement engine designed for modern merchants.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {BENEFITS.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* Compliance Note */}
      <section className="py-12 px-6 max-w-6xl mx-auto w-full">
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Building2 className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-base text-foreground">KYC / AML Regulatory Compliance</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                All fiat conversions and bank deposits comply strictly with local Central Bank regulations, Financial Action Task Force (FATF) travel rule standards, and jurisdiction-specific Know Your Customer mandates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-foreground">FATF Compliant</span>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 px-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Ready to automate your merchant fiat settlements?</h2>
          <p className="text-muted-foreground text-sm md:text-base">Configure your settlement bank account in the BettaPay dashboard in under 3 minutes.</p>
          <Link href="/auth/login" className="inline-block">
            <Button size="lg" className="font-semibold px-8 rounded-xl h-12 text-base">
              Configure in Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
