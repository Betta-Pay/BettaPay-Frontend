import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotify } from '@/lib/hooks/useNotify';
import { signChallenge } from '@/lib/stellar/freighter';

export function useLogin() {
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

  return {
    isWalletLoading,
    walletModalOpen,
    setWalletModalOpen,
    onGoogleSuccess,
    onWalletConnected,
    error
  };
}
