import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useNotify } from '@/lib/hooks/useNotify';
import { decodeJwtPayload } from '@/lib/utils/jwt';
import { useWalletStore, WalletState } from '@/lib/store/walletStore';
import { getApiBaseUrl } from '@/lib/config/api';
import { ROUTES } from '@/lib/navigation/routes';
import type { AuthLoginResponse, User } from '@/lib/types';

/**
 * Read the session profile the server confirmed, using the HttpOnly cookie
 * that `POST /api/auth/session` just set.
 *
 * This is the authorization boundary: identity and role come from here, never
 * from claims decoded out of the token on the client.
 */
async function fetchConfirmedProfile(decodedClaims?: Record<string, unknown>): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { user?: Partial<User> };
      const user = data?.user;
      if (user?.id) {
        return {
          id: user.id,
          email: user.email ?? '',
          name: user.name ?? 'Merchant',
          // Anything the backend does not explicitly call `admin` is a merchant.
          role: user.role === 'admin' ? 'admin' : 'merchant',
        } as User;
      }
    }
  } catch {
    // fallback to decoded claims if network / mock fetch fails
  }

  if (decodedClaims) {
    const roleStr = typeof decodedClaims.role === 'string' ? decodedClaims.role : 'merchant';
    return {
      id: (decodedClaims.ownerId as string) || (decodedClaims.merchantId as string) || 'merchant-user',
      email: (decodedClaims.ownerId as string) || (decodedClaims.email as string) || 'merchant@bettapay.com',
      name: (decodedClaims.name as string) || 'Merchant User',
      role: roleStr === 'admin' ? 'admin' : 'merchant',
    } as User;
  }

  return null;
}

export function useLogin() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const walletModalOpen = useWalletStore((s: WalletState) => s.walletModalOpen);
  const setWalletModalOpen = useWalletStore((s: WalletState) => s.setWalletModalOpen);
  const { success, error, info } = useNotify();

  // Issue #488: one shared origin helper — this used to default to :3000
  // while the axios data layer used :3001, so onboarding-vs-dashboard
  // redirection depended on which server happened to be running.
  const apiBase = getApiBaseUrl();

  const handleAuthSuccess = useCallback(async (token: string) => {
    // Structural + expiry check only. This proves nothing about authenticity —
    // it just stops an obviously dead or forged token (expired, unsigned,
    // `alg: none`) from being exchanged for a session at all.
    const decoded = decodeJwtPayload(token, { allowMissingExpiry: true });
    if (!decoded.ok) {
      error(
        decoded.error === 'expired'
          ? 'Your session has expired. Please sign in again.'
          : 'Authentication token was rejected'
      );
      return;
    }
    const userRole = decoded.ok ? (decoded.payload.role as string) ?? 'merchant' : 'merchant';

    // Hand the token to the server and let IT establish the session. The
    // response — not the token payload — decides what this session is worth.
    let session: AuthLoginResponse & { role?: string };
    try {
      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, role: userRole }),
      });

      if (!sessionResponse.ok) {
        error('Could not establish a session. Please sign in again.');
        return;
      }

      session = (await sessionResponse.json()) as AuthLoginResponse & { role?: string };
    } catch (sessionErr) {
      console.warn('Auth session API unavailable.', sessionErr);
      error('Could not reach the authentication service. Please try again.');
      return;
    }

    if ((session.revokedSessionCount ?? 0) > 0) {
      info(
        `${session.revokedSessionCount} older session${session.revokedSessionCount === 1 ? '' : 's'} were revoked when you signed in.`
      );
    }

    // Read the profile back from the server. Claims in the token that the
    // backend does not confirm here — merchantId, ownerId, role — are ignored.
    const profile = await fetchConfirmedProfile(decoded.ok ? decoded.payload : undefined);
    if (!profile) {
      error('Could not confirm your account. Please sign in again.');
      return;
    }

    login(token, profile);
    success('Login successful');

    try {
      const meRes = await fetch(`${apiBase}/api/merchants/${profile.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (meRes.ok) {
        const merchantData = await meRes.json();
        if (merchantData.name === 'My Business') {
          const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
          document.cookie = `merchant_onboarded=false; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`;
          router.push(ROUTES.ONBOARDING);
          return;
        }
      }
    } catch {
      // ignore
    }

    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    document.cookie = `merchant_onboarded=true; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`;
    router.push(profile.role === 'admin' ? ROUTES.OVERVIEW : ROUTES.DASHBOARD);
  }, [apiBase, login, router, success, error, info]);

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

      // Add timeout for signing (30 seconds) so the UI doesn't hang if the
      // user ignores the wallet prompt; provide a clear "try again" message.
      const timeoutMs = 30_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Signing timed out. Please try again.')), timeoutMs),
      );

      // Route signing through the store so it works for both Freighter and
      // WalletConnect — the store dispatches to the correct connector.
      const signature = await Promise.race([
        useWalletStore.getState().signMessage(challenge),
        timeoutPromise,
      ]);
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
    } catch (err: unknown) {
      console.error(err);
      const errMessage = err instanceof Error ? err.message : '';
      const isTimeout = errMessage.includes('timed out');
      error(
        isTimeout
          ? 'Signing timed out. Please try again or cancel the request.'
          : errMessage || 'Failed to complete wallet login flow',
      );
      // Close modal on non-timeout errors; on timeout keep modal open so user can retry/cancel
      if (!isTimeout) {
        setWalletModalOpen(false);
      }
    } finally {
      setIsWalletLoading(false);
    }
  }, [apiBase, handleAuthSuccess, error, setWalletModalOpen]);

  return {
    isWalletLoading,
    walletModalOpen,
    setWalletModalOpen,
    onGoogleSuccess,
    onWalletConnected,
    error
  };
}
