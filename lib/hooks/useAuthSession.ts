'use client';

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { ROUTES } from "@/lib/navigation/routes";
import type { User } from "@/lib/types";

interface SessionResponse {
  user?: User;
  token?: string;
}

/**
 * Server-authoritative session state. Zustand may cache identity for rendering,
 * but only the cookie-backed /api/auth/session response can validate a session.
 */
export function useAuthSession() {
  const pathname = usePathname();
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);

  const verifySession = useCallback(async (signal?: AbortSignal) => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        setIsSessionValid(false);
        await logout();
        router.replace(ROUTES.LOGIN);
        return;
      }

      const session = (await response.json()) as SessionResponse;
      if (!session.user || !session.token) {
        setIsSessionValid(false);
        await logout();
        router.replace(ROUTES.LOGIN);
        return;
      }

      login(session.token, session.user);
      setIsSessionValid(true);
    } catch {
      // A failed check is never treated as a valid session. Protected routes
      // remain gated until the server can confirm the cookie.
      setIsSessionValid(false);
    } finally {
      setIsVerifying(false);
    }
  }, [login, logout, router]);

  useEffect(() => {
    const controller = new AbortController();
    void verifySession(controller.signal);
    return () => controller.abort();
  }, [pathname, verifySession]);

  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === "visible") void verifySession();
    };
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [verifySession]);

  return { isVerifying, isSessionValid };
}
