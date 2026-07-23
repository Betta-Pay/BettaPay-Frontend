"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Percent, Globe, Code2, HeartHandshake } from "lucide-react";

interface ValueCard {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}

const values: ValueCard[] = [
  {
    title: "Non-Custodial by Design",
    description: "Merchants retain full control of their private keys and funds at all times. No central intermediary can freeze your funds.",
    icon: ShieldCheck,
  },
  {
    title: "Settle Instantly",
    description: "Leverage Stellar network speed to settle payments into local bank accounts in seconds instead of multi-day clearing delays.",
    icon: Zap,
  },
  {
    title: "Transparent Fees",
    description: "Predictable, low transaction fees with zero hidden charges or inflated foreign exchange spread markups.",
    icon: Percent,
  },
  {
    title: "Built for Africa",
    description: "Tailored specifically for African business realities, supporting local currencies, mobile money, and regional anchors.",
    icon: Globe,
  },
  {
    title: "Open Source",
    description: "Core smart contracts, SDKs, and developer tools are open source and independently auditable by the community.",
    icon: Code2,
  },
];

export function Values() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden border-b border-border/40">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Core Principles</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Our Guiding Values
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The foundational standards that guide how we engineer our payment infrastructure and serve African merchants.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((val, idx) => {
            const IconComp = val.icon;
            return (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="group relative rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {val.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {val.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
