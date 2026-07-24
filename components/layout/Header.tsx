"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

export default function Header() {
  const { t } = useAppTranslation();
  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <Link href="/" className="text-lg font-bold text-foreground">BettaPay</Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground" aria-label="Main navigation">
          <Link href="#features" className="hover:text-foreground transition-colors">{t('navigation.features')}</Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">{t('navigation.developers')}</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">{t('navigation.company')}</Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Link href="/auth/login">
            <Button variant="ghost" className="hidden text-muted-foreground hover:text-foreground font-medium sm:inline-flex">{t('navigation.login')}</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="hidden bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button md:inline-flex">{t('navigation.getStarted')}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
