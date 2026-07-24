"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui";

interface JobRole {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
}

const openRoles: JobRole[] = [
  {
    title: "Frontend Engineer",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    description: "Build ultra-responsive React/Next.js merchant dashboards, payment SDK widgets, and Web3 wallet integrations.",
  },
  {
    title: "Backend Engineer",
    department: "Engineering",
    location: "Remote (Africa)",
    type: "Full-time",
    description: "Design high-concurrency Node.js/Go microservices, Stellar indexers, and webhook notification engines.",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote (Africa)",
    type: "Full-time",
    description: "Shape the next generation of friction-free merchant checkout flows and non-custodial wallet UX.",
  },
  {
    title: "Developer Relations",
    department: "DevRel & Growth",
    location: "Remote (Africa)",
    type: "Full-time",
    description: "Empower developer communities with docs, tutorials, open-source SDKs, and hackathon workshops.",
  },
];

export function Careers() {
  return (
    <section id="careers" className="py-20 md:py-28 bg-muted/30 border-b border-border/40 relative overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Join Our Mission</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            We&apos;re Hiring
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We are building a remote-first, high-performing culture of creators, engineers, and visionaries passionate about financial infrastructure for Africa.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {openRoles.map((role, idx) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group rounded-2xl bg-card border border-border p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    {role.department}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {role.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {role.type}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {role.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-6">
                  {role.description}
                </p>
              </div>

              <Link href={`/contact?subject=careers&role=${encodeURIComponent(role.title)}`}>
                <Button variant="outline" className="w-full justify-between font-medium group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-200">
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
