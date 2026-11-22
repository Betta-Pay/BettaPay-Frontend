'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/navigation/routes';
import type { SessionCheckResponse } from '@/lib/auth/session';

export function useSessionCheck() {
  const [isVerifying, setIsVerifying] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const lastCheckRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSession = useCallback(async (signal?: AbortSignal) => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/session', { method: 'GET', credentials: 'include', signal });
      if (!res.ok) {
        // Session expired or rotated away — clear persisted state and redirect
        // Aligns with middleware's getSessionFromCookies/isSessionValid on auth_token + user_role
        await logout();
        router.replace(ROUTES.LOGIN);
        return null;
      }
      const data = (await res.json().catch(() => null)) as SessionCheckResponse | null;
      if (data?.user && data?.token) {
        // Shared Session shape: { user, token } from GET /api/auth/session (route.ts:14-22)
        // Mirrors middleware's cookie contract (auth_token + user_role)
        login(data.token, data.user);
      }
      // If backend responds OK but no user data, treat session as valid and leave state alone
      return data;
    } catch {
      // Backend unavailable or aborted — assume session is valid in mock/preview mode
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [login, logout, router]);

  // Rehydrate after tab restore / store loss — also catches drift after token rotation
  useEffect(() => {
    if (isAuthenticated || !isLoggedIn) return;
    lastCheckRef.current = Date.now();
    const ctrl = new AbortController();
    void fetchSession(ctrl.signal);
    return () => ctrl.abort();
  }, [isAuthenticated, isLoggedIn, fetchSession]);

  // Re-check on focus / visibility to catch drift when middleware saw a new
  // auth_token+user_role after rotation but this tab still has stale memory.
  useEffect(() => {
    const onFocus = () => {
      // Throttle to avoid storm on rapid focus
      if (lastCheckRef.current !== null && Date.now() - lastCheckRef.current < 2000) return;
      lastCheckRef.current = Date.now();
      // Always re-verify when user returns to tab, even if isAuthenticated,
      // so a revoked/rotated session is caught before rendering protected content.
      const ctrl = new AbortController();
      void fetchSession(ctrl.signal);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        ctrl.abort();
        timeoutRef.current = null;
      }, 5000);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchSession]);

  return { isVerifying };
}
