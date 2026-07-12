"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Loader2 } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import dynamic from 'next/dynamic';

import { loginSchema, LoginFormValues } from '@/lib/utils/validation';
import { useAuthStore } from '@/lib/store/authStore';
import { useRateLimitStore } from '@/lib/store/rateLimitStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';

const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const rateLimitedUntil = useRateLimitStore((s) => s.rateLimitedUntil);
  const secondsRemaining = useRateLimitStore((s) => s.secondsRemaining);
  const tick = useRateLimitStore((s) => s.tick);
  const isRateLimited = rateLimitedUntil > Date.now();
  const { success, error } = useNotify();

  // Tick the countdown every second while rate-limited
  useEffect(() => {
    if (!isRateLimited) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRateLimited, tick]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = useCallback(async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bettapay-backend.onrender.com';

      // POST /api/auth/token expects { merchantId, secret }
      const loginRes = await fetch(`${apiBase}/api/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: data.merchantId,
          secret: data.secret,
        }),
      });

      if (!loginRes.ok) {
        const errBody = await loginRes.json().catch(() => ({}));
        const message =
          errBody?.error ||
          errBody?.message ||
          (loginRes.status === 401 ? 'Invalid Merchant ID or secret key.' : 'Login failed. Please try again.');
        error(message);
        return;
      }

      const { token } = await loginRes.json();

      if (!token) {
        error('Unexpected response from server. Please try again.');
        return;
      }

      // Decode the JWT payload to get merchantId and role (no signature verification needed client-side)
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));

      const user = {
        id: payload.merchantId ?? data.merchantId,
        email: '',
        name: 'Merchant',
        role: (payload.role ?? 'merchant') as 'admin' | 'merchant',
      };

      // Set the HttpOnly auth cookie via the Next.js session route
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
      router.push(user.role === 'admin' ? '/overview' : '/dashboard');
    } catch (err) {
      console.error(err);
      error('Network error — unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [login, router, success, error]);

  // Wallet login: wallet address becomes the merchant identifier.
  // A proper wallet-challenge JWT flow (sign nonce, verify on backend) is
  // the intended production path once the backend has /api/auth/wallet.
  const onWalletConnected = useCallback(async (address: string) => {
    setIsWalletLoading(true);
    try {
      const role = 'merchant';
      const walletSessionToken = `wallet_${address}`;

      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: walletSessionToken, role }),
        });
      } catch (sessionErr) {
        console.warn('Auth session API unavailable.', sessionErr);
      }

      login(walletSessionToken, {
        id: address,
        email: `${address.substring(0, 6)}...${address.slice(-4)}@freighter.app`,
        name: 'Web3 Merchant',
        role,
      });
      success('Wallet connected & Logged in!');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      error('Failed to complete wallet-login flow');
    } finally {
      setIsWalletLoading(false);
    }
  }, [login, router, success, error]);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<WalletModalFallback open={walletModalOpen} onOpenChange={setWalletModalOpen} />}>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} onConnected={onWalletConnected} />
      </Suspense>

      {/* Heading */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Merchant Portal</p>
        <h1 className="text-4xl font-bold text-foreground leading-tight">Sign in to<br />your account</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary font-semibold hover:text-primary transition-colors">
            Create one free
          </Link>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Merchant ID */}
        <div className="space-y-1.5">
          <Label htmlFor="merchantId" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Merchant ID
          </Label>
          <Input
            id="merchantId"
            type="text"
            placeholder="Your Stellar merchant address"
            {...register('merchantId')}
            aria-invalid={errors.merchantId ? "true" : "false"}
            aria-describedby={errors.merchantId ? "merchantId-error" : undefined}
            className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm font-mono focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all"
          />
          {errors.merchantId && <p id="merchantId-error" className="text-xs text-destructive mt-1">{errors.merchantId.message}</p>}
        </div>

        {/* Secret Key */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="secret" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Secret Key
            </Label>
            <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Lost your secret?
            </Link>
          </div>
          <Input
            id="secret"
            type="password"
            placeholder="Your merchant secret key"
            {...register('secret')}
            aria-invalid={errors.secret ? "true" : "false"}
            aria-describedby={errors.secret ? "secret-error" : undefined}
            className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all"
          />
          {errors.secret && <p id="secret-error" className="text-xs text-destructive mt-1">{errors.secret.message}</p>}
          <p className="text-xs text-muted-foreground">
            The secret key shown once when you created your account.
          </p>
        </div>

        {/* Sign In CTA */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading || isWalletLoading || isRateLimited}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isRateLimited ? `Try again in ${secondsRemaining}s` : 'Sign In'}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-muted" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-muted" />
      </div>

      {/* Wallet button */}
      <Button
        type="button"
        onClick={() => setWalletModalOpen(true)}
        disabled={isLoading || isWalletLoading || isRateLimited}
        className="w-full h-12 bg-card border border-border text-foreground hover:bg-muted font-medium text-sm rounded-xl transition-colors"
      >
        {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Connect Freighter Wallet
      </Button>
    </div>
  );
}
