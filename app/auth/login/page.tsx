"use client";

import { useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import dynamic from 'next/dynamic';

import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
import { signChallenge } from '@/lib/stellar/freighter';
import { GoogleLogin } from '@react-oauth/google';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

const benefits = [
  { icon: Zap, key: 'settlement' },
  { icon: Globe, key: 'currency' },
  { icon: Shield, key: 'custody' },
];

export default function LoginPage() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { login } = useAuthStore();
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { success, error } = useNotify();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleAuthSuccess = useCallback(async (token: string) => {
    const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));

    const user = {
      id: payload.merchantId,
      email: payload.ownerId,
      name: 'Merchant',
      role: (payload.role ?? 'merchant') as 'admin' | 'merchant',
    };

    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role: user.role }),
      });
    } catch (sessionErr) {
      console.warn('Auth session cookie API unavailable.', sessionErr);
    }

    login(token, user as import('@/lib/types').User);
    success('Login successful');

    try {
      const meRes = await fetch(`${apiBase}/api/merchants/${payload.merchantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const merchantData = await meRes.json();
        if (merchantData.name === 'My Business') {
          router.push('/onboarding');
          return;
        }
      }
    } catch {
      // ignore
    }

    router.push(user.role === 'admin' ? '/overview' : '/dashboard');
  }, [apiBase, login, router, success]);

  const onGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        error(errData.error || 'Google login failed');
        return;
      }
      const { token } = await res.json();
      await handleAuthSuccess(token);
    } catch (err) {
      console.error(err);
      error('Failed to communicate with server');
    }
  };

  const onWalletConnected = useCallback(async (address: string) => {
    setIsWalletLoading(true);
    try {
      const challengeRes = await fetch(`${apiBase}/api/auth/wallet/challenge?address=${address}`);
      if (!challengeRes.ok) throw new Error('Failed to fetch challenge');
      const { challenge } = await challengeRes.json();

      const signature = await signChallenge(address, challenge);
      if (!signature) throw new Error('User rejected or failed to sign challenge');

      const verifyRes = await fetch(`${apiBase}/api/auth/wallet/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, challenge, signature }),
      });
      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to verify signature');
      }

      const { token } = await verifyRes.json();
      await handleAuthSuccess(token);
    } catch (err) {
      console.error(err);
      error(err instanceof Error ? err.message : 'Failed to complete wallet login flow');
    } finally {
      setIsWalletLoading(false);
      setWalletModalOpen(false);
    }
  }, [apiBase, handleAuthSuccess, error]);

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
