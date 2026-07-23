"use client";

import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";

interface Publication {
  name: string;
  tagline: string;
}

const publications: Publication[] = [
  { name: "TechCrunch", tagline: "Featured in African Fintech Roundup" },
  { name: "CoinDesk", tagline: "Stellar Soroban Merchant Infrastructure" },
  { name: "TechCabal", tagline: "Reinventing Non-Custodial Cross-Border Settlement" },
  { name: "Disrupt Africa", tagline: "Top Web3 Startups to Watch" },
  { name: "Bloomberg", tagline: "Stablecoins in Sub-Saharan African Commerce" },
];

export function Press() {
  return (
    <section className="py-20 md:py-24 relative overflow-hidden border-b border-border/40">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <Newspaper className="w-3.5 h-3.5" />
            <span>Media Coverage</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            As Seen In
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Featured across global and regional tech & financial media outlets.
          </p>
        </div>

        {/* Publication Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {publications.map((pub, idx) => (
            <motion.div
              key={pub.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              className="group p-6 rounded-2xl bg-card/60 border border-border/60 flex flex-col items-center justify-center text-center shadow-sm hover:border-primary/40 hover:bg-card transition-all duration-300"
            >
              <span className="font-extrabold tracking-wider text-lg md:text-xl text-muted-foreground/80 group-hover:text-foreground group-hover:scale-105 transition-all duration-300">
                {pub.name}
              </span>
              <span className="mt-2 text-[10px] text-muted-foreground font-medium line-clamp-2">
                {pub.tagline}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
