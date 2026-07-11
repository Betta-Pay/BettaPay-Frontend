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
    const sanitizedData = { ...data, email: normalizeEmail(data.email) };
    try {
      const isMockAdmin = sanitizedData.email.includes('admin');
      const role = isMockAdmin ? 'admin' : 'merchant';
      
      let merchantId = 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD';
      let merchantName = isMockAdmin ? 'System Admin' : 'Merchant User';

      try {
        // Use plain fetch (no auth interceptors) to avoid triggering the 401→redirect chain
        // during the pre-auth merchant lookup. The endpoint requires a JWT we don't have yet.
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bettapay-backend.onrender.com';
        const res = await fetch(`${apiBase}/api/merchants/${merchantId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && !data.error) {
            merchantId = data.data?.id ?? data.id ?? merchantId;
            merchantName = data.data?.name ?? data.name ?? merchantName;
          }
        }
      } catch {
        console.warn('Backend unavailable, falling back to mock auth for Vercel preview.');
      }

      const mockToken = 'mock_jwt_token_12345';
      const mockUser = {
        id: merchantId,
        email: sanitizedData.email,
        name: merchantName,
        role,
      };

      // Ask the backend to set an HttpOnly auth cookie and store minimal user info client-side
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: mockToken, role }),
        });
      } catch (error) {
        // Backend unavailable; continue without setting insecure client cookies.
        console.warn('Auth session API unavailable; continuing without HttpOnly cookie.', error);
      }

      // Keep token in-memory for current session only (not persisted)
      login(mockToken, mockUser as import('@/lib/types').User);
      success('Login successful');
      
      router.push(role === 'admin' ? '/overview' : '/dashboard');
    } catch (err) {
      console.error(err);
      error('Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  }, [login, router, success, error]);

  // When WalletModal reports a connected address, perform the merchant login flow
  const onWalletConnected = useCallback(async (address: string) => {
    setIsWalletLoading(true);
    try {
      const mockToken = 'mock_jwt_token_12345';
      const role = 'merchant';
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: mockToken, role }),
        });
      } catch (error) {
        console.warn('Auth session API unavailable; continuing without HttpOnly cookie.', error);
      }

      login(mockToken, { 
        id: address, 
        email: `${address.substring(0,6)}...${address.slice(-4)}@freighter.app`, 
        name: 'Web3 Merchant', 
        role 
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
          <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all"
          />
          {errors.email && <p id="email-error" className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Password
            </Label>
            <Link href="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all"
          />
          {errors.password && <p id="password-error" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {/* Sign In CTA */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading || isWalletLoading || isRateLimited}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52"
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
