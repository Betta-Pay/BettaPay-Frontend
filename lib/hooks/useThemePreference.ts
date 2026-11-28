"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/store/authStore";

/** Returns the localStorage key scoped to the current user (or guest). */
export function getThemeStorageKey(userId: string | null): string {
  return `bp_theme__${userId ?? "guest"}`;
}

const VALID_THEMES = new Set(["light", "dark", "system"]);

/**
 * useThemePreference
 *
 * Side-effect hook — mount it once near the top of the authenticated shell.
 *
 * Responsibilities:
 *  1. Restore the persisted theme for the current user on mount.
 *  2. Migrate guest preference → user-scoped key on login.
 *  3. Clear the user-scoped key on logout (so the next user starts fresh).
 *  4. Re-sync live OS colour-scheme changes while in "system" mode.
 */
export function useThemePreference(): void {
  const { theme, setTheme } = useTheme();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  // The store starts empty on the server (and on the first client paint before
  // zustand-persist has rehydrated), so `userId` is briefly `null`. Acting on
  // that transient value would read the *guest* theme key and can flash the
  // wrong theme (issue #1148).
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const prevUserIdRef = useRef<string | null>(null);
  // Distinguishes the identity observed at rehydration (the current session)
  // from a genuine later login/logout transition.
  const identityInitialisedRef = useRef(false);

  // ── 1. Restore preference on mount (Hydration Safe) ─────────────────────
  const getSnapshot = () => {
    const key = getThemeStorageKey(userId);
    return window.localStorage.getItem(key);
  };
  const getServerSnapshot = () => null;
  const subscribe = () => () => {}; // We handle changes via other effects

  const storedTheme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Wait for rehydration so we read the theme for the *real* user rather than
    // the guest fallback (issue #1148).
    if (!hasHydrated) return;
    if (storedTheme && VALID_THEMES.has(storedTheme)) {
      setTheme(storedTheme);
    }
  }, [hasHydrated, storedTheme, setTheme]);

  // ── 2. Handle user identity transitions (login / logout) ─────────────────
  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;

    // The first identity seen once rehydration has completed is simply the
    // current session — not a login. Record it and skip, otherwise every reload
    // re-runs the guest→user migration and can overwrite the saved theme with a
    // stale guest value (issue #1148).
    if (!identityInitialisedRef.current) {
      identityInitialisedRef.current = true;
      prevUserIdRef.current = userId;
      return;
    }

    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    if (prev === userId) return; // no transition

    if (prev === null && userId !== null) {
      // Login: migrate guest preference to user-scoped key, then restore.
      const guestKey = getThemeStorageKey(null);
      const userKey = getThemeStorageKey(userId);
      const guestStored = localStorage.getItem(guestKey);
      if (guestStored && VALID_THEMES.has(guestStored)) {
        localStorage.setItem(userKey, guestStored);
        setTheme(guestStored);
      } else {
        // No guest pref — check if this user had a prior preference.
        const userStored = localStorage.getItem(userKey);
        if (userStored && VALID_THEMES.has(userStored)) {
          setTheme(userStored);
        }
      }
    } else if (prev !== null && userId === null) {
      // Logout: do NOT carry the theme forward; next-themes will fall back
      // to the defaultTheme ("system") on the next page load.
      const userKey = getThemeStorageKey(prev);
      localStorage.removeItem(userKey);
    }
  }, [hasHydrated, userId, setTheme]);

  // ── 3. Persist on every theme change ─────────────────────────────────────
  useEffect(() => {
    // Don't persist until rehydration settles, otherwise the resolved theme is
    // written to the guest key while the real user is still unknown (#1148).
    if (!hasHydrated || typeof window === "undefined" || !theme) return;
    if (!VALID_THEMES.has(theme)) return;
    const key = getThemeStorageKey(userId);
    localStorage.setItem(key, theme);
  }, [hasHydrated, theme, userId]);

  // ── 4. Live OS colour-scheme sync while in "system" mode ─────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      // Re-read current theme from storage (theme closure may be stale).
      const key = getThemeStorageKey(userId);
      const stored = localStorage.getItem(key) ?? "system";
      if (stored === "system") {
        // Force next-themes to re-resolve the OS value.
        setTheme("system");
      }
    };

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [userId, setTheme]);
}
