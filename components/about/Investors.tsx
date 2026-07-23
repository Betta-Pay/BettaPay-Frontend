"use client";

import { motion } from "framer-motion";
import { ExternalLink, ShieldCheck, Award } from "lucide-react";

interface Investor {
  name: string;
  category: string;
  description: string;
  logoText: string;
  url: string;
}

const investors: Investor[] = [
  {
    name: "Stellar Development Foundation",
    category: "Ecosystem Grant & Anchor Partner",
    description: "Supporting open-source payment innovation and Soroban smart contract development.",
    logoText: "STELLAR",
    url: "https://stellar.org",
  },
  {
    name: "Pantera Capital",
    category: "Lead Venture Backer",
    description: "Premier Web3 venture fund empowering emerging market fintech infrastructure.",
    logoText: "PANTERA",
    url: "https://panteracapital.com",
  },
  {
    name: "Dragonfly Capital",
    category: "Global Crypto VC",
    description: "Investing in cross-border settlement protocols and decentralized finance networks.",
    logoText: "DRAGONFLY",
    url: "https://dragonfly.xyz",
  },
  {
    name: "Coinbase Ventures",
    category: "Strategic Partner",
    description: "Backing open financial infrastructure to connect local merchants to global liquidity.",
    logoText: "COINBASE",
    url: "https://ventures.coinbase.com",
  },
];

const partners = [
  { name: "Soroban Incubator", tier: "Ecosystem Partner" },
  { name: "African Fintech Alliance", tier: "Regional Partner" },
  { name: "Stellar Anchor Network", tier: "Settlement Partner" },
  { name: "MoneyGram Access", tier: "Liquidity Partner" },
];

export function Investors() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-border/40">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <Award className="w-3.5 h-3.5" />
            <span>Capital & Strategic Backers</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Backed by leading Web3 investors
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We are supported by world-class venture funds and ecosystem leaders who share our vision for friction-free African commerce.
          </p>
        </div>

        {/* Investors Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {investors.map((investor, idx) => (
            <motion.a
              key={investor.name}
              href={investor.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="group relative rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Logo Placeholder with Grayscale to Color Hover */}
                <div className="h-16 rounded-xl bg-muted/60 flex items-center justify-between px-4 mb-6 border border-border/50 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
                  <span className="font-extrabold tracking-widest text-lg text-muted-foreground grayscale group-hover:grayscale-0 group-hover:text-primary transition-all duration-300">
                    {investor.logoText}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>

                <h3 className="font-bold text-foreground text-base mb-1 group-hover:text-primary transition-colors">
                  {investor.name}
                </h3>
                <p className="text-xs font-semibold text-primary/90 mb-2">
                  {investor.category}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {investor.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Partners Banner */}
        <div className="rounded-2xl bg-card/60 border border-border/80 p-8 text-center max-w-4xl mx-auto shadow-card">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">
              Ecosystem & Liquidity Partners
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 items-center justify-center pt-2">
            {partners.map((partner, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-sm font-semibold text-foreground/90">
                  {partner.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {partner.tier}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
