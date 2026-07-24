"use client";

import { Suspense } from 'react';
import { Loader2, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
import { GoogleLogin } from '@react-oauth/google';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { useLogin } from '@/lib/hooks/useLogin';

const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

const benefits = [
  { icon: Zap, key: 'settlement' },
  { icon: Globe, key: 'currency' },
  { icon: Shield, key: 'custody' },
];

export default function LoginPage() {
  const { t } = useAppTranslation();
  
  const {
    isWalletLoading,
    walletModalOpen,
    setWalletModalOpen,
    onGoogleSuccess,
    onWalletConnected,
    error
  } = useLogin();

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<WalletModalFallback open={walletModalOpen} onOpenChange={setWalletModalOpen} />}>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} onConnected={onWalletConnected} />
      </Suspense>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('login.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t('login.description')}
        </p>
      </div>

      {/* Auth buttons */}
      <div className="space-y-3">
        <div className="flex justify-center [&>div]:w-full rounded-xl overflow-hidden border border-border">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => error('Google login failed')}
            shape="rectangular"
            theme="outline"
            size="large"
            width="400"
          />
        </div>

        <div className="relative flex items-center py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="px-3 text-xs text-muted-foreground font-medium">{t('login.or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          type="button"
          onClick={() => setWalletModalOpen(true)}
          disabled={isWalletLoading}
          className="w-full h-12 bg-card border border-border text-foreground hover:bg-muted font-medium text-sm rounded-xl transition-colors"
        >
          {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('login.connectWallet')}
        </Button>
      </div>

      {/* Benefits */}
      <div className="mt-10 pt-8 border-t border-border">
        <div className="grid gap-5">
          {benefits.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t(`login.benefits.${item.key}.title`)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(`login.benefits.${item.key}.description`)}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href="/"
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('login.learnMore')}
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
