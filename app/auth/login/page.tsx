"use client";

import { useState, useEffect, Suspense } from 'react';
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

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const isMockAdmin = data.email.includes('admin');
      const role = isMockAdmin ? 'admin' : 'merchant';
      
      let merchantId = 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD';
      let merchantName = isMockAdmin ? 'System Admin' : 'Merchant User';

      try {
        // Try fetching the seeded merchant from the backend
        const { apiClient } = await import('@/lib/api/axios');
        const response = await apiClient.get(`/api/merchants/${merchantId}`);
        if (response.data && !response.data.error) {
          merchantId = response.data.id;
          merchantName = response.data.name;
        }
      } catch {
        console.warn('Backend unavailable, falling back to mock auth for Vercel preview.');
      }

      const mockToken = 'mock_jwt_token_12345';
      const mockUser = {
        id: merchantId,
        email: data.email,
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
  };

  // When WalletModal reports a connected address, perform the merchant login flow
  const onWalletConnected = async (address: string) => {
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
    } catch (err) {
      console.error(err);
      error('Failed to complete wallet-login flow');
    } finally {
      setIsWalletLoading(false);
    }
  };


  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<WalletModalFallback open={walletModalOpen} onOpenChange={setWalletModalOpen} />}>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} onConnected={onWalletConnected} />
      </Suspense>

      {/* Heading */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-3">Merchant Portal</p>
        <h1 className="text-4xl font-bold text-slate-900 leading-tight">Sign in to<br />your account</h1>
        <p className="text-slate-400 mt-3 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-amber-600 font-semibold hover:text-amber-700 transition-colors">
            Create one free
          </Link>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-12 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:border-amber-400 transition-all"
          />
          {errors.email && <p id="email-error" className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Password
            </Label>
            <Link href="/auth/forgot-password" className="text-xs text-slate-400 hover:text-amber-600 transition-colors">
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
            className="h-12 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:border-amber-400 transition-all"
          />
          {errors.password && <p id="password-error" className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        {/* Sign In CTA */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading || isWalletLoading || isRateLimited}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isRateLimited ? `Try again in ${secondsRemaining}s` : 'Sign In'}
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-xs text-slate-400 font-medium">or</span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>

      {/* Wallet button */}
      <Button
        type="button"
        onClick={() => setWalletModalOpen(true)}
        disabled={isLoading || isWalletLoading || isRateLimited}
        className="w-full h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm rounded-xl transition-colors"
      >
        {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Connect Freighter Wallet
      </Button>
    </div>
  );
}

