"use client";

import React, { Suspense } from 'react';
import { Loader2, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { Button } from '@/components/ui';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
import { NetworkTooltip } from '@/components/ui/network-tooltip';
import { GoogleLogin } from '@react-oauth/google';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { useLogin } from '@/lib/hooks/useLogin';
import { EmailLoginForm } from '@/components/auth/EmailLoginForm';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';

// Module-level sentinel: fires the dev-mode missing-config warning at most
// once across the lifetime of the JS bundle. Avoids the Strict Mode effect
// double-fire that would otherwise spam `console.warn`.
let hasWarnedMissingGoogleClientId = false;
export function __resetGoogleWarnForTests() {
  hasWarnedMissingGoogleClientId = false;
}

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
    error,
  } = useLogin();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const googleConfigured = Boolean(googleClientId);

  // Surface the missing-config situation to developers exactly once. We
  // dedupe with a module-level flag because React 18 Strict Mode mounts
  // useEffects twice in dev, and we don't want to spam the console.
  if (
    !googleConfigured &&
    !hasWarnedMissingGoogleClientId &&
    process.env.NODE_ENV !== 'production'
  ) {
    hasWarnedMissingGoogleClientId = true;
    // eslint-disable-next-line no-console
    console.warn(
      '[BettaPay] Google login is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in.',
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<WalletModalFallback />}>
        <WalletModal 
          isOpen={walletModalOpen} 
          onClose={() => setWalletModalOpen(false)} 
          onConnected={onWalletConnected}
        />
      </Suspense>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('login.title')}</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t('login.description')}
        </p>
      </div>

      {/* Auth buttons & Email Form */}
      <div className="space-y-3">
        {/* Email / Password Sign In Form */}
        <EmailLoginForm />

        {/* Passwordless: email magic link (issue #466) */}
        <MagicLinkForm />

        <div className="relative flex items-center py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="px-3 text-xs text-muted-foreground font-medium">{t('login.or')}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Alternate Login Options: Wallet & Google */}
        {googleConfigured ? (
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
        ) : (
          <NetworkTooltip
            show
            id="google-login-missing-config"
            message="Google login not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID"
          >
            <Button
              variant="outline"
              disabled
              aria-disabled="true"
              aria-describedby="google-login-missing-config"
              className="w-full h-12 border-border bg-card text-muted-foreground cursor-not-allowed"
              title="Google login not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID"
            >
              <span className="opacity-60">Continue with Google</span>
            </Button>
          </NetworkTooltip>
        )}

        <Button
          type="button"
          onClick={() => setWalletModalOpen(true)}
          disabled={isWalletLoading}
          className="w-full h-12 bg-card border border-border text-foreground hover:bg-muted font-medium text-sm rounded-xl transition-colors"
        >
          {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('login.connectWallet')}
        </Button>

        {/* Register link */}
        <div className="text-center pt-2">
          <span className="text-xs text-muted-foreground">Don&apos;t have an account? </span>
          <Link
            href="/auth/register"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Create an account
          </Link>
        </div>
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
                <p className="text-sm font-medium text-foreground">{t(`login.benefits.${item.key}.title` as never)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(`login.benefits.${item.key}.description` as never)}</p>
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
