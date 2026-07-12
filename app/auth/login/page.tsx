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
import { normalizeEmail } from '@/lib/utils/sanitize';
import { useAuthStore } from '@/lib/store/authStore';
import { useRateLimitStore } from '@/lib/store/rateLimitStore';
import { Button } from '@/components/ui/button';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthLabel } from '@/components/auth/AuthLabel';
import { AuthButton } from '@/components/auth/AuthButton';

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
    const sanitizedData = { ...data, email: normalizeEmail(data.email) };

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bettapay-backend.onrender.com';

      // Authenticate against the real backend — no mock tokens
      const loginRes = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sanitizedData.email,
          password: sanitizedData.password,
        }),
      });

      if (!loginRes.ok) {
        const errBody = await loginRes.json().catch(() => ({}));
        const message =
          errBody?.message ||
          errBody?.error ||
          (loginRes.status === 401 ? 'Invalid email or password.' : 'Login failed. Please try again.');
        error(message);
        return;
      }

      const loginData = await loginRes.json();

      // Backend returns { token, user: { id, email, name, role, ... } }
      const token: string = loginData.token ?? loginData.data?.token;
      const backendUser = loginData.user ?? loginData.data?.user;

      if (!token || !backendUser) {
        error('Unexpected response from server. Please try again.');
        return;
      }

      const user = {
        id: backendUser.id,
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role as 'admin' | 'merchant',
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
        // Cookie set failure is non-fatal — in-memory auth will still work for this tab
        console.warn('Auth session cookie API unavailable.', sessionErr);
      }

      // Store token in-memory for the current session
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

  // When WalletModal reports a connected address, perform the merchant login flow.
  // NOTE: Full wallet-challenge authentication (sign a nonce, verify on-chain) is
  // the intended production approach — this flow requires a backend /api/auth/wallet
  // endpoint that issues a real JWT after verifying the signed challenge.
  const onWalletConnected = useCallback(async (address: string) => {
    setIsWalletLoading(true);
    try {
      const role = 'merchant';

      // Placeholder: derive a session identifier from the wallet address.
      // Replace this with a proper wallet-challenge JWT flow when the
      // backend /api/auth/wallet endpoint is implemented.
      const walletSessionToken = `wallet_${address}`;

      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: walletSessionToken, role }),
        });
      } catch (sessionErr) {
        console.warn('Auth session API unavailable; continuing without HttpOnly cookie.', sessionErr);
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
        {/* Email */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="email">
            Email Address
          </AuthLabel>
          <AuthInput
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <p id="email-error" className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <AuthLabel htmlFor="password">
              Password
            </AuthLabel>
            <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </div>
          <AuthInput
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && <p id="password-error" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {/* Sign In CTA */}
        <div className="pt-1">
          <AuthButton
            type="submit"
            disabled={isLoading || isWalletLoading || isRateLimited}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isRateLimited ? `Try again in ${secondsRemaining}s` : 'Sign In'}
          </AuthButton>
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
