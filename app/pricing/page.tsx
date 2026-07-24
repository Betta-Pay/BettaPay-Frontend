import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/layout';
import Footer from '@/components/layout';
import { TierCard } from '@/components/pricing/TierCard';
import { ComparisonTable } from '@/components/pricing/ComparisonTable';
import { VolumeCalculator } from '@/components/pricing/VolumeCalculator';
import { FAQ } from '@/components/pricing/FAQ';
import { EnterpriseCTA } from '@/components/pricing/EnterpriseCTA';
import { PRICING_TIERS } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Pricing | BettaPay',
  description:
    'Simple, transparent pricing for accepting USDC payments. Pay-as-you-go from 1.5% + $0.10 per transaction, volume discounts on Growth, and custom Enterprise plans. No hidden fees, no chargebacks.',
  openGraph: {
    title: 'Pricing | BettaPay',
    description:
      'Simple, transparent pricing for accepting USDC payments. No hidden fees, no monthly minimums, no chargebacks.',
    type: 'website',
    siteName: 'BettaPay',
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1">
        {/* Hero */}
        <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
          <div className="container mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              No hidden fees. Pay only when you get paid.
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter max-w-3xl mx-auto leading-tight">
              Simple, transparent <span className="text-primary">pricing</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Start free with pay-as-you-go, unlock volume discounts as you grow, and go custom at
              enterprise scale. No setup fees, no monthly minimums, no chargebacks.
            </p>
          </div>
        </section>

        {/* Tier cards */}
        <section aria-label="Pricing plans" className="pb-20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
              {PRICING_TIERS.map((tier) => (
                <TierCard key={tier.id} {...tier} />
              ))}
            </div>
          </div>
        </section>

        {/* Volume calculator */}
        <section aria-label="Cost calculator" className="py-20 bg-muted border-y border-border">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Estimate your monthly cost
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Drag the slider to your expected volume and see what you would pay on each plan.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <Suspense fallback={<div className="h-96 rounded-2xl border border-border bg-card animate-pulse" />}>
                <VolumeCalculator />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section aria-label="Feature comparison" className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Compare plans in detail
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Everything included in each tier, side by side.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <ComparisonTable />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-label="Frequently asked questions" className="py-20 bg-muted border-y border-border">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Everything you need to know about BettaPay pricing.
              </p>
            </div>
            <FAQ />
          </div>
        </section>

        {/* Enterprise CTA */}
        <section aria-label="Enterprise contact" className="py-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <EnterpriseCTA />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
