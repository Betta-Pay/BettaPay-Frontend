"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, resetAllUserState } from "@/lib/store/authStore";
import { ROUTES } from "@/lib/navigation/routes";
import type { User } from "@/lib/types";

const AUTH_STORAGE_KEY = "bp-session";
const CHANNEL_NAME = "bettapay-auth-sync";

/**
 * Shape `useCrossTabAuth`'s storage-event fallback depends on (issue #490).
 * zustand-persist writes `{ state: {...}, version: n }` under `bp-session`;
 * a real session is `state.isAuthenticated && state.user != null`.
 */
interface PersistedSessionEnvelope {
  state?: { isAuthenticated?: boolean; user?: User | null; isLoggedIn?: boolean };
}

interface AuthChannelMessage {
  type: "AUTH_LOGIN" | "AUTH_LOGOUT" | "AUTH_TOKEN_EXPIRED";
}

/** Debounce redirects so two signals for one logout produce one navigation. */
let redirectInFlight = false;

function clearLocalSession() {
  useAuthStore.setState({
    user: null,
    token: null,
    role: null,
    isAuthenticated: false,
    isLoggedIn: false,
  });
  resetAllUserState();
}

/**
 * Keeps auth state in sync across tabs (issues #489, #490).
 *
 * - **One primary mechanism:** `BroadcastChannel` when available; the
 *   `storage` event is a *fallback* registered only when BroadcastChannel is
 *   not supported, so a single event is never handled twice.
 * - **Login propagates identity:** on `AUTH_LOGIN` the receiving tab pulls
 *   the session from `/api/auth/session` and hydrates its store, so a tab
 *   opened before login shows the user without a manual refresh.
 * - **Logout is idempotent:** the redirect to `/auth/login` fires exactly
 *   once even if both a channel message and a storage event arrive.
 */
export function useCrossTabAuth() {
  const router = useRouter();

  useEffect(() => {
    const supportsBroadcast = typeof BroadcastChannel !== "undefined";
    let channel: BroadcastChannel | null = null;

    const handleLogout = () => {
      if (!useAuthStore.getState().isAuthenticated) return;
      clearLocalSession();
      if (!redirectInFlight) {
        redirectInFlight = true;
        router.push(ROUTES.LOGIN);
        // Allow another redirect once this navigation settles.
        setTimeout(() => {
          redirectInFlight = false;
        }, 1000);
      }
    };

    const handleLoginElsewhere = async () => {
      if (useAuthStore.getState().isAuthenticated) return;
      try {
        const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          router.refresh();
          return;
        }
        const body = (await res.json()) as { user?: User; token?: string };
        if (body.user) {
          useAuthStore.setState({
            user: body.user,
            token: body.token ?? null,
            role: body.user.role ?? null,
            isAuthenticated: true,
            isLoggedIn: true,
          });
        }
        router.refresh();
      } catch {
        router.refresh();
      }
    };

    const onMessage = (event: MessageEvent<AuthChannelMessage>) => {
      switch (event.data?.type) {
        case "AUTH_LOGOUT":
        case "AUTH_TOKEN_EXPIRED":
          handleLogout();
          break;
        case "AUTH_LOGIN":
          void handleLoginElsewhere();
          break;
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      let envelope: PersistedSessionEnvelope | null = null;
      try {
        envelope = event.newValue ? (JSON.parse(event.newValue) as PersistedSessionEnvelope) : null;
      } catch {
        return; // malformed — don't infer logout from an unreadable value
      }
      const s = envelope?.state;
      // Only act on a *shape we understand*. If the key is missing or the
      // session flag is explicitly false with no user, that's a logout.
      const hasSession = Boolean(s?.isAuthenticated && s?.user);
      if (!hasSession) handleLogout();
      else if (!useAuthStore.getState().isAuthenticated) void handleLoginElsewhere();
    };

    if (supportsBroadcast) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener("message", onMessage);
    } else {
      window.addEventListener("storage", onStorage);
    }

    // Outbound: broadcast our own transitions (only when the channel is the
    // primary mechanism — storage writes propagate on their own).
    const unsub = useAuthStore.subscribe((state, prev) => {
      if (!channel) return;
      if (state.isAuthenticated && !prev.isAuthenticated) {
        channel.postMessage({ type: "AUTH_LOGIN" } satisfies AuthChannelMessage);
      } else if (!state.isAuthenticated && prev.isAuthenticated) {
        channel.postMessage({ type: "AUTH_LOGOUT" } satisfies AuthChannelMessage);
      }
    });

    return () => {
      unsub();
      if (channel) {
        channel.removeEventListener("message", onMessage);
        channel.close();
      } else {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, [router]);
}
