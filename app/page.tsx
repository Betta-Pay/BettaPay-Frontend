"use client";

import Link from 'next/link';
import { ArrowRight, Zap, Globe, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

const features = [
  {
    icon: Zap,
    key: "settlement"
  },
  {
    icon: Globe,
    key: "offRamps"
  },
  {
    icon: Coins,
    key: "fees"
  }
];

export default function LandingPage() {
  const { t } = useAppTranslation();
  return (
    <div className="min-h-screen bg-card text-foreground">
      <Header />

      {/* Hero Section */}
      <main id="main-content" tabIndex={-1} className="pt-12 pb-12 lg:pt-36 lg:pb-32">
        <div className="container mx-auto px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary font-medium mb-10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t('landing.badge')}
          </div>

          {/* Headline */}
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter max-w-4xl mx-auto leading-tight text-foreground">
            {t('landing.headline')}{' '}
            <br className="hidden lg:block" />
            <span className="text-primary">{t('landing.headlineAccent')}</span>
          </h1>

          <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('landing.description')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button className="h-12 px-8 text-base bg-primary text-white hover:bg-primary font-semibold rounded-xl">
                {t('landing.primaryCta')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" className="h-12 px-8 text-base border-border bg-card text-foreground hover:bg-muted font-medium rounded-xl">
                {t('landing.secondaryCta')}
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4 text-foreground">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {t('landing.featuresDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3 text-foreground">{t(`landing.features.${feature.key}.title`)}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{t(`landing.features.${feature.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
