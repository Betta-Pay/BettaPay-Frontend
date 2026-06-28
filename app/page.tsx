"use client";

import Link from 'next/link';
import { ArrowRight, Zap, Globe, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const features = [
  {
    icon: Zap,
    title: "Instant Settlement",
    desc: "Transactions settle in 3-5 seconds. No more waiting days for cross-border wires to clear."
  },
  {
    icon: Globe,
    title: "SEP-24 Fiat Off-Ramps",
    desc: "Automated routing to Stellar Anchors for direct-to-bank Nigerian Naira payouts."
  },
  {
    icon: Coins,
    title: "Smart Fee Splits",
    desc: "Soroban contracts automatically calculate and route platform fees trustlessly on-chain."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      {/* Hero Section */}
      <main className="pt-12 pb-12 lg:pt-36 lg:pb-32">
        <div className="container mx-auto px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Now live on Soroban Testnet
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter max-w-4xl mx-auto leading-tight text-slate-900">
            Settle Globally.{' '}
            <br className="hidden lg:block" />
            <span className="text-amber-500">Instantly &amp; Non-Custodial.</span>
          </h1>

          <p className="mt-6 text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            The next-generation merchant payment platform for African businesses. Accept USDC, auto-convert via SEP-24 anchors, and get settled directly to your bank.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button className="h-12 px-8 text-base bg-amber-500 text-white hover:bg-amber-600 font-semibold rounded-xl">
                Start Accepting Crypto
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="h-12 px-8 text-base border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium rounded-xl">
                Explore Features
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-slate-900">
              Powered by Stellar &amp; Soroban
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Enterprise-grade payment infrastructure designed for speed, low fees, and perfect transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
                  <feature.icon className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
