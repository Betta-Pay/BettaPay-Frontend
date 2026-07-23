"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Rocket, Flag, Layers, Users, TrendingUp } from "lucide-react";

interface Milestone {
  date: string;
  title: string;
  description: string;
  icon: typeof Rocket;
  status: "completed" | "upcoming";
}

const milestones: Milestone[] = [
  {
    date: "2024 Q1",
    title: "Company Founded",
    description: "BettaPay incorporated with a mission to solve African merchant settlement bottlenecks using Stellar.",
    icon: Flag,
    status: "completed",
  },
  {
    date: "2024 Q2",
    title: "Testnet Launch",
    description: "Released initial non-custodial Soroban payment gateway contracts & developer SDKs on Stellar testnet.",
    icon: Layers,
    status: "completed",
  },
  {
    date: "2024 Q3",
    title: "Mainnet Launch",
    description: "Deploying production mainnet smart contracts and automated NGN/KES fiat bank settlement anchors.",
    icon: Rocket,
    status: "completed",
  },
  {
    date: "2024 Q4",
    title: "First 100 Merchants",
    description: "Onboarded 100+ active merchants across Nigeria, Kenya, and Ghana processing live cross-border payments.",
    icon: Users,
    status: "completed",
  },
  {
    date: "2025 Q1",
    title: "Series A Funding",
    description: "Scaling operational reach to 12+ African markets, expanding SDK ecosystem, and launching developer API v2.",
    icon: TrendingUp,
    status: "upcoming",
  },
];

export function Timeline() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b border-border/40 relative overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Our Journey</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Key Company Milestones
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            From our founding vision to high-throughput mainnet deployment and beyond.
          </p>
        </div>

        {/* Desktop Horizontal Timeline (Hidden on Mobile) */}
        <div className="hidden lg:block relative my-12">
          {/* Horizontal Connecting Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-border/80 -translate-y-1/2 z-0" />
          <div className="absolute top-1/2 left-0 w-3/4 h-1 bg-gradient-to-r from-primary via-amber-400 to-amber-500 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-5 gap-4 relative z-10">
            {milestones.map((item, idx) => {
              const IconComp = item.icon;
              const isEven = idx % 2 === 0;

              return (
                <motion.div
                  key={item.date}
                  initial={{ opacity: 0, y: isEven ? -20 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="flex flex-col items-center"
                >
                  {/* Content Box Above Line for Even Index */}
                  {isEven && (
                    <div className="mb-8 w-full p-4 rounded-2xl bg-card border border-border shadow-card text-center hover:border-primary/40 transition-all duration-300 min-h-[160px] flex flex-col justify-center">
                      <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 w-fit mx-auto mb-2">
                        {item.date}
                      </span>
                      <h3 className="font-bold text-foreground text-sm mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  )}

                  {/* Node Circle on Line */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                      item.status === "completed"
                        ? "bg-primary border-primary text-primary-foreground shadow-glow"
                        : "bg-card border-border text-muted-foreground"
                    } transition-transform duration-300 hover:scale-110`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>

                  {/* Content Box Below Line for Odd Index */}
                  {!isEven && (
                    <div className="mt-8 w-full p-4 rounded-2xl bg-card border border-border shadow-card text-center hover:border-primary/40 transition-all duration-300 min-h-[160px] flex flex-col justify-center">
                      <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 w-fit mx-auto mb-2">
                        {item.date}
                      </span>
                      <h3 className="font-bold text-foreground text-sm mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile / Tablet Vertical Timeline (Hidden on Large Desktop) */}
        <div className="lg:hidden relative pl-6 space-y-8 my-8 border-l-2 border-primary/40">
          {milestones.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <motion.div
                key={item.date}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="relative pl-6"
              >
                {/* Node Icon on Vertical Line */}
                <div
                  className={`absolute -left-[37px] top-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    item.status === "completed"
                      ? "bg-primary border-primary text-primary-foreground shadow-glow"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </div>

                {/* Content Box */}
                <div className="p-5 rounded-2xl bg-card border border-border shadow-card space-y-2">
                  <span className="inline-block text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    {item.date}
                  </span>
                  <h3 className="font-bold text-foreground text-base">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
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
