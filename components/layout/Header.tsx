"use client";

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <Link href="/" className="text-lg font-bold text-foreground">BettaPay</Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
          <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
          <Link href="#company" className="hover:text-foreground transition-colors">Company</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium">Log in</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
