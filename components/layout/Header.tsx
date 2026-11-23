"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { ROUTES } from '@/lib/navigation/routes';
import { useHeaderAuth } from './HeaderAuthContext';

export default function Header() {
  const { t } = useAppTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Supplied by app/(marketing)/layout.tsx from request cookies, so it is
  // already correct during SSR — no logged-out flash before hydration.
  const { isAuthenticated, role } = useHeaderAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BettaPay Logo" width={24} height={24} className="w-full h-full object-contain" />
          </div>
          <Link href={ROUTES.HOME} className="text-lg font-bold text-foreground">BettaPay</Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground" aria-label="Main navigation">
          <Link href="/#features" className="hover:text-foreground transition-colors">{t('navigation.features')}</Link>
          <Link href="/docs" className="hover:text-foreground transition-colors">{t('navigation.developers')}</Link>
          <Link href="/about" className="hover:text-foreground transition-colors">{t('navigation.company')}</Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSelector />
          {isAuthenticated ? (
            <Link href={role === 'admin' ? ROUTES.OVERVIEW : ROUTES.DASHBOARD}>
              <Button className="hidden bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button sm:inline-flex">{t('navigation.dashboard')}</Button>
            </Link>
          ) : (
            <>
              <Link href={ROUTES.LOGIN}>
                <Button variant="ghost" className="hidden text-muted-foreground hover:text-foreground font-medium sm:inline-flex">{t('navigation.login')}</Button>
              </Link>
              <Link href={ROUTES.REGISTER}>
                <Button className="hidden bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button md:inline-flex">{t('navigation.getStarted')}</Button>
              </Link>
            </>
          )}

          {/* Mobile menu trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 space-y-4"
        >
          <nav className="flex flex-col gap-3 text-base font-medium text-muted-foreground" aria-label="Mobile navigation">
            <Link
              href="/#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-foreground transition-colors py-1"
            >
              {t('navigation.features')}
            </Link>
            <Link
              href="/docs"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-foreground transition-colors py-1"
            >
              {t('navigation.developers')}
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-foreground transition-colors py-1"
            >
              {t('navigation.company')}
            </Link>
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            {isAuthenticated ? (
              <Link
                href={role === 'admin' ? ROUTES.OVERVIEW : ROUTES.DASHBOARD}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button">
                  {t('navigation.dashboard')}
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href={ROUTES.LOGIN}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button variant="outline" className="w-full text-foreground font-medium">
                    {t('navigation.login')}
                  </Button>
                </Link>
                <Link
                  href={ROUTES.REGISTER}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-button">
                    {t('navigation.getStarted')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
