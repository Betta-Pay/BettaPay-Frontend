"use client";

import { useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import dynamic from 'next/dynamic';

import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
import { signChallenge } from '@/lib/stellar/freighter';
import { GoogleLogin } from '@react-oauth/google';

const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { success, error } = useNotify();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleAuthSuccess = useCallback(async (token: string) => {
    // Decode JWT to get merchantId and ownerId
    const payloadBase64 = token.split('.')[1];
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

    // Onboarding check: if name is still the default "My Business", redirect to onboarding
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
    } catch (e) {
      // ignore
    }
    
    router.push(user.role === 'admin' ? '/overview' : '/dashboard');
  }, [apiBase, login, router, success]);

  const onGoogleSuccess = async (credentialResponse: any) => {
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
      // 1. Get challenge
      const challengeRes = await fetch(`${apiBase}/api/auth/wallet/challenge?address=${address}`);
      if (!challengeRes.ok) throw new Error('Failed to fetch challenge');
      const { challenge } = await challengeRes.json();

      // 2. Sign challenge
      const signature = await signChallenge(address, challenge);
      if (!signature) throw new Error('User rejected or failed to sign challenge');

      // 3. Verify
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
    } catch (err: any) {
      console.error(err);
      error(err.message || 'Failed to complete wallet login flow');
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
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-foreground leading-tight">Sign in</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Continue with Google or your Stellar wallet
        </p>
      </div>

      <div className="space-y-4">
        {/* Google button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={onGoogleSuccess}
            onError={() => error('Google login failed')}
            useOneTap
            shape="rectangular"
            theme="filled_blue"
            size="large"
            width="100%"
          />
        </div>

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
          disabled={isWalletLoading}
          className="w-full h-12 bg-card border border-border text-foreground hover:bg-muted font-medium text-sm rounded-xl transition-colors"
        >
          {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Connect Freighter Wallet
        </Button>
      </div>
    </div>
  );
}
