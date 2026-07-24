"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, TrendingUp, Users, Globe, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";

const metrics = [
  {
    label: "Total Payment Volume",
    value: "$50M+",
    change: "+125% YOY",
    icon: TrendingUp,
    description: "Processed securely via Stellar network",
  },
  {
    label: "Active Merchants",
    value: "5,000+",
    change: "Across Africa",
    icon: Users,
    description: "SMEs, marketplaces & platforms",
  },
  {
    label: "Countries Supported",
    value: "12+",
    change: "Direct Payouts",
    icon: Globe,
    description: "Instant local currency bank settlements",
  },
  {
    label: "Average Settlement Time",
    value: "< 5s",
    change: "Real-time",
    icon: Zap,
    description: "Non-custodial, sub-second finality",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 border-b border-border/40">
      {/* Background Gradients & Glow */}
      <div className="aria-hidden:true pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[450px] w-[600px] rounded-full bg-primary/10 blur-[130px] dark:bg-primary/15 animate-pulse" />
        <div className="absolute top-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Non-Custodial Payment Gateway</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl text-balance leading-[1.15]"
          >
            Building payment infrastructure for{" "}
            <span className="bg-gradient-to-r from-primary via-amber-400 to-amber-600 bg-clip-text text-transparent">
              African merchants
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed text-balance max-w-2xl mx-auto"
          >
            BettaPay empowers businesses across Africa to accept stablecoins, manage digital treasury, and settle into local fiat currency instantly without custodial risk or high transaction fees.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <Link href="/auth/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button px-8 gap-2 group">
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/docs" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-medium gap-2 border-border hover:bg-muted">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Read our Docs
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {metrics.map((metric, idx) => {
            const IconComponent = metric.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl bg-card/60 backdrop-blur-md border border-border/80 p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {metric.change}
                  </span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-foreground mb-1">
                  {metric.value}
                </div>
                <div className="text-sm font-semibold text-foreground/90 mb-1">
                  {metric.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {metric.description}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
