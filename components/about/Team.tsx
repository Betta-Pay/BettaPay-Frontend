"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface TeamMember {
  name: string;
  role: string;
  category: "Founders" | "Engineering" | "Product" | "Advisors";
  bio: string;
  avatar: string;
  linkedin: string;
}

const teamMembers: TeamMember[] = [
  // Founders
  {
    name: "Alhaji Shehu",
    role: "Co-Founder & CEO",
    category: "Founders",
    bio: "Pioneering financial inclusion through non-custodial Web3 payment systems in West Africa.",
    avatar: "https://ui-avatars.com/api/?name=Alhaji+Shehu&background=F0A500&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },
  {
    name: "Tunde Bakare",
    role: "Co-Founder & CTO",
    category: "Founders",
    bio: "Former Distributed Systems Lead with 10+ years architecting high-throughput fintech infrastructure.",
    avatar: "https://ui-avatars.com/api/?name=Tunde+Bakare&background=0F172A&color=F0A500&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },

  // Engineering
  {
    name: "Amina Yusuf",
    role: "Lead Smart Contract Engineer",
    category: "Engineering",
    bio: "Stellar ecosystem contributor specializing in Soroban smart contracts and automated market makers.",
    avatar: "https://ui-avatars.com/api/?name=Amina+Yusuf&background=2563EB&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },
  {
    name: "David Okafor",
    role: "Senior Full Stack Engineer",
    category: "Engineering",
    bio: "Building ultra-fast responsive merchant dashboards and secure payment gateways.",
    avatar: "https://ui-avatars.com/api/?name=David+Okafor&background=16A34A&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },
  {
    name: "Kofi Mensah",
    role: "Infrastructure & Security Lead",
    category: "Engineering",
    bio: "Ensuring 99.99% uptime, zero-downtime deployments, and banking-grade encryption.",
    avatar: "https://ui-avatars.com/api/?name=Kofi+Mensah&background=8B5CF6&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },

  // Product
  {
    name: "Chidimma Nwosu",
    role: "Head of Product",
    category: "Product",
    bio: "Obsessed with creating seamless merchant payment UX for non-crypto-native African business owners.",
    avatar: "https://ui-avatars.com/api/?name=Chidimma+Nwosu&background=EC4899&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },
  {
    name: "Kwame Asante",
    role: "Lead UI/UX Designer",
    category: "Product",
    bio: "Crafting accessible, intuitive interfaces designed for lightning-fast merchant checkout experiences.",
    avatar: "https://ui-avatars.com/api/?name=Kwame+Asante&background=F59E0B&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },

  // Advisors
  {
    name: "Dr. Hassan Bello",
    role: "Strategic Payments Advisor",
    category: "Advisors",
    bio: "Ex-Central Bank Strategy Consultant specializing in Pan-African cross-border settlement regulation.",
    avatar: "https://ui-avatars.com/api/?name=Hassan+Bello&background=64748B&color=fff&size=200&bold=true",
    linkedin: "https://linkedin.com/in/",
  },
];

const categories: Array<TeamMember["category"]> = [
  "Founders",
  "Engineering",
  "Product",
  "Advisors",
];

export function Team() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b border-border/40">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Our Team</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Meet the minds behind BettaPay
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We are a mission-driven team of engineers, designers, and financial strategists building the future of African digital commerce.
          </p>
        </div>

        {/* Grouped Team Sections */}
        <div className="space-y-16">
          {categories.map((category) => {
            const categoryMembers = teamMembers.filter(
              (m) => m.category === category
            );

            if (categoryMembers.length === 0) return null;

            return (
              <div key={category} className="space-y-6">
                {/* Subcategory Label */}
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">
                    {category}
                  </h3>
                  <div className="flex-1 h-px bg-border/60" />
                </div>

                {/* Grid: 4 cols desktop, 2 cols tablet, 1 col mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {categoryMembers.map((member, idx) => (
                    <motion.div
                      key={member.name}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      className="group relative rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Avatar & Header */}
                        <div className="flex items-center justify-between mb-5">
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300">
                            <Image
                              src={member.avatar}
                              alt={member.name}
                              width={64}
                              height={64}
                              className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                          </div>
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name}'s LinkedIn Profile`}
                            className="p-2 rounded-xl bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                            </svg>
                          </a>
                        </div>

                        {/* Name & Role */}
                        <h4 className="text-lg font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                          {member.name}
                        </h4>
                        <p className="text-xs font-semibold text-primary/90 mb-3">
                          {member.role}
                        </p>

                        {/* Bio */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {member.bio}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
