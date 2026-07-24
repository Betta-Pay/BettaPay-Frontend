import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/layout";
import Footer from "@/components/layout";
import { Hero } from "@/components/about/Hero";
import { Team } from "@/components/about/Team";
import { Investors } from "@/components/about/Investors";
import { Timeline } from "@/components/about/Timeline";
import { Values } from "@/components/about/Values";
import { Careers } from "@/components/about/Careers";
import { Press } from "@/components/about/Press";
import { Button } from "@/components/ui";
import { ArrowRight, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | BettaPay",
  description:
    "BettaPay is building non-custodial payment infrastructure for African merchants, empowering businesses to accept stablecoins and settle into local fiat currency instantly.",
  openGraph: {
    title: "About Us | BettaPay",
    description:
      "Non-custodial payment gateway for African merchants. Accept global stablecoins and settle to local bank accounts in seconds.",
    url: "https://bettapay.app/about",
    siteName: "BettaPay",
    images: [
      {
        url: "https://bettapay.app/og-about.png",
        width: 1200,
        height: 630,
        alt: "BettaPay Payment Infrastructure",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | BettaPay",
    description: "Building payment infrastructure for African merchants.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <Header />

      <main className="flex-1">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Team */}
        <Team />

        {/* 3. Investors */}
        <Investors />

        {/* 4. Timeline */}
        <Timeline />

        {/* 5. Values */}
        <Values />

        {/* 6. Careers */}
        <Careers />

        {/* 7. Press */}
        <Press />

        {/* 8. Bottom CTA */}
        <section className="py-20 md:py-28 relative overflow-hidden bg-card/60 border-b border-border/40">
          <div className="aria-hidden:true pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
            <div className="h-[350px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 text-center max-w-3xl space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl text-balance">
              Ready to accept crypto payments?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed text-balance max-w-xl mx-auto">
              Join thousands of African merchants expanding their reach with non-custodial stablecoin payments and instant fiat settlement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button px-8 gap-2 group">
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium gap-2 border-border hover:bg-muted">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
