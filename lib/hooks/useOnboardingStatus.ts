"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Single source of truth for merchant onboarding completion (issue #495).
 *
 * The **`merchant_onboarded` cookie** is authoritative — the middleware reads
 * it to keep completed merchants off `/onboarding`. `onboardingCompleted` in
 * localStorage is kept as a synchronous mirror so the dismissible
 * `OnboardingWizard` doesn't flash on first paint, but it is never written
 * without the cookie. The `/onboarding` 5-step page and the layout wizard
 * both gate on this hook, so completing either one hides both everywhere.
 *
 * `onboardingDraft` (the 5-step page's in-progress form state) is a separate
 * concern and untouched here.
 */

const COOKIE = "merchant_onboarded";
const MIRROR_KEY = "onboardingCompleted";

function readCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${COOKIE}=true`);
}

function readMirror(): boolean {
  try {
    return window.localStorage.getItem(MIRROR_KEY) === "true";
  } catch {
    return false;
  }
}

function writeAll(done: boolean) {
  try {
    window.localStorage.setItem(MIRROR_KEY, String(done));
  } catch {
    /* ignore */
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (done) {
    document.cookie = `${COOKIE}=true; Path=/; SameSite=Lax; Max-Age=86400${secure}`;
  } else {
    document.cookie = `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  }
}

export function useOnboardingStatus() {
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Cookie wins; fall back to the mirror only if the cookie is absent
    // (e.g. a pre-#495 completion that only wrote localStorage).
    setIsOnboarded(readCookie() || readMirror());
    setHydrated(true);
  }, []);

  const markComplete = useCallback(() => {
    writeAll(true);
    setIsOnboarded(true);
  }, []);

  const markIncomplete = useCallback(() => {
    writeAll(false);
    setIsOnboarded(false);
  }, []);

  return { isOnboarded, hydrated, markComplete, markIncomplete };
}
