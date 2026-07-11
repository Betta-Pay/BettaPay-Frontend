"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Code2, Briefcase, Mail } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-border bg-card/60 mt-auto"
    >
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center p-1">
                <Image src="/logo.png" alt="BettaPay Logo" width={28} height={28} className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-foreground">BettaPay</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              The next-generation non-custodial payment gateway for African merchants. Accept global stablecoin payments and settle directly to your local bank account in seconds. Built securely on the Stellar network.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors"><MessageCircle className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Code2 className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Briefcase className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Mail className="w-5 h-5" /></Link>
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Merchant Dashboard</Link></li>
              <li><Link href="/payments" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Payment Links</Link></li>
              <li><Link href="/settlement" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fiat Settlements</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Developers</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Documentation</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Integration Guides</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">SDKs & Libraries</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Status</Link></li>
            </ul>
          </div>

          {/* Links Col 3 */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} BettaPay Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
