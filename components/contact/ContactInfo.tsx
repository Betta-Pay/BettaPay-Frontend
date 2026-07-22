"use client";

import {
  Mail,
  AtSign,
  Code2,
  MapPin,
  Clock,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";

interface ContactMethodProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  href?: string;
  isExternal?: boolean;
}

function ContactMethod({ icon, title, value, href, isExternal = true }: ContactMethodProps) {
  const content = (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-muted/30 transition-all duration-200 group">
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-200 shrink-0">
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h4>
        <div className="flex items-center gap-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          <span>{value}</span>
          {href && isExternal && (
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="block"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default function ContactInfo() {
  return (
    <div className="space-y-8">
      {/* Quick Summary / Intro */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Other Ways to Reach Us
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Need support or want to partner with us? Choose your preferred channel. We are here to assist you and grow together.
        </p>
      </div>

      {/* Main Channels */}
      <div className="space-y-4">
        <ContactMethod
          icon={<Mail className="w-5 h-5" />}
          title="Email Us"
          value="support@bettapay.com"
          href="mailto:support@bettapay.com"
          isExternal={false}
        />

        <ContactMethod
          icon={<AtSign className="w-5 h-5" />}
          title="Follow on Twitter"
          value="@BettaPay"
          href="https://twitter.com/BettaPay"
        />

        <ContactMethod
          icon={<MessageCircle className="w-5 h-5" />}
          title="Join Discord Community"
          value="discord.gg/bettapay"
          href="https://discord.gg/bettapay"
        />

        <ContactMethod
          icon={<Code2 className="w-5 h-5" />}
          title="Open Source GitHub"
          value="github.com/bettapay"
          href="https://github.com/bettapay"
        />
      </div>

      <div className="border-t border-border/80 my-6" />

      {/* Meta Details (Address, Hours, Response time) */}
      <div className="space-y-4">
        {/* Office Location */}
        <div className="flex items-start gap-4">
          <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Headquarters</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              123 Innovation Way, Victoria Island,<br />
              Lagos, Nigeria
            </p>
          </div>
        </div>

        {/* Business Hours */}
        <div className="flex items-start gap-4">
          <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">Business Hours</h4>
            <p className="text-sm text-muted-foreground">
              Monday – Friday: 9:00 AM – 5:00 PM WAT
            </p>
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              Closed on weekends & national holidays.
            </p>
          </div>
        </div>
      </div>

      {/* Expected Response Time Banner */}
      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1">
          Typical Response Time
        </p>
        <p className="text-sm leading-relaxed">
          We review and reply to all inquiries within <span className="font-semibold">24 hours</span> on business days.
        </p>
      </div>
    </div>
  );
}
