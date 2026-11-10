'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { csrfHeader } from '@/lib/utils/csrf';

export const DEFAULT_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_GRACE_PERIOD_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const;
const LOCKED_BLUR_CLASSES = ['blur-sm', 'pointer-events-none', 'select-none'] as const;

export interface UseSessionTimeoutOptions {
  /** Inactivity threshold in ms before showing warning / locking screen (default: 15 min) */
  timeoutMs?: number;
  /** Grace period in ms after warning before auto-logout (default: 5 min) */
  gracePeriodMs?: number;
  /** Optional server authoritative expiration timestamp (in ms) */
  serverExpiresAt?: number | null;
  /** Called when the session has timed out */
  onTimeout: () => void;
}

export interface UseSessionTimeoutReturn {
  /** Whether the warning modal should be shown */
  showWarning: boolean;
  /** Whether the dashboard screen is currently locked due to inactivity */
  isLocked: boolean;
  /** Seconds remaining in the grace period / session deadline */
  secondsRemaining: number;
  /** Whether currently in the final minute of the grace period */
  isLastMinute: boolean;
  /** Whether an extension request is in flight */
  isExtending: boolean;
  /** Dismiss the warning and reset the timer locally */
  dismissWarning: () => void;
  /** Immediately lock the session and open the confirmation modal */
  lockSession: () => void;
  /** Call the backend refresh API to update the server authoritative deadline */
  extendSession: () => Promise<boolean>;
  /** Re-authenticate with a PIN or password credential and unlock the session */
  unlockSession: (credential?: string) => Promise<boolean>;
}

function syncDocumentLockBlur(locked: boolean): void {
  if (typeof document === 'undefined') return;
  if (locked) {
    document.documentElement.setAttribute('data-session-locked', 'true');
  } else {
    document.documentElement.removeAttribute('data-session-locked');
  }
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    if (locked) {
      mainContent.classList.add(...LOCKED_BLUR_CLASSES);
      mainContent.setAttribute('aria-hidden', 'true');
    } else {
      mainContent.classList.remove(...LOCKED_BLUR_CLASSES);
      mainContent.removeAttribute('aria-hidden');
    }
  }
}

export function useSessionTimeout({
  timeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  gracePeriodMs = DEFAULT_GRACE_PERIOD_MS,
  serverExpiresAt = null,
  onTimeout,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(gracePeriodMs / 1000)
  );
  const [isExtending, setIsExtending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expiryDeadline, setExpiryDeadline] = useState<number | null>(serverExpiresAt);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (graceRef.current) {
      clearInterval(graceRef.current);
      graceRef.current = null;
    }
  }, []);

  const startGracePeriod = useCallback((deadlineMs?: number) => {
    const targetExpiry = deadlineMs || Date.now() + gracePeriodMs;
    setExpiryDeadline(targetExpiry);

    const updateCountdown = () => {
      const now = Date.now();
      const remainingSecs = Math.max(0, Math.ceil((targetExpiry - now) / 1000));
      setSecondsRemaining(remainingSecs);

      if (remainingSecs <= 0) {
        clearAllTimers();
        setShowWarning(false);
        setIsLocked(false);
        syncDocumentLockBlur(false);
        onTimeoutRef.current();
      }
    };

    updateCountdown();
    if (graceRef.current) clearInterval(graceRef.current);
    graceRef.current = setInterval(updateCountdown, 1000);
  }, [gracePeriodMs, clearAllTimers]);

  const lockSession = useCallback(() => {
    clearAllTimers();
    setShowWarning(true);
    setIsLocked(true);
    syncDocumentLockBlur(true);
    startGracePeriod();
  }, [clearAllTimers, startGracePeriod]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setIsLocked(false);
    syncDocumentLockBlur(false);
    setSecondsRemaining(Math.floor(gracePeriodMs / 1000));

    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setIsLocked(true);
      syncDocumentLockBlur(true);
      startGracePeriod();
    }, timeoutMs);
  }, [timeoutMs, gracePeriodMs, clearAllTimers, startGracePeriod]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const extendSession = useCallback(async (): Promise<boolean> => {
    setIsExtending(true);
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeader() },
        credentials: 'include',
      });

      // The refresh token itself is invalid — this is a real logout, not a
      // failed extension. Let the caller's onTimeout run once (issue #487:
      // "redirect to login once, without toast spam").
      if (res.status === 401) {
        clearAllTimers();
        setShowWarning(false);
        setIsLocked(false);
        syncDocumentLockBlur(false);
        onTimeoutRef.current();
        return false;
      }

      if (!res.ok) {
        throw new Error('Failed to refresh session');
      }

      const data = await res.json().catch(() => ({}));
      // A real rotation returns the new access token — propagate it into the
      // auth store so API calls stop tripping the local expiry pre-check
      // (issue #487).
      if (data.refreshed && typeof data.token === 'string' && data.token.length > 0) {
        useAuthStore.getState().setToken(data.token);
      }
      const newExpiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + timeoutMs + gracePeriodMs;
      setExpiryDeadline(newExpiresAt);
      resetTimer();
      return true;
    } catch (err) {
      console.error('[SessionTimeout] Failed to extend session:', err);
      return false;
    } finally {
      setIsExtending(false);
    }
  }, [timeoutMs, gracePeriodMs, resetTimer, clearAllTimers]);

  const unlockSession = useCallback(
    async (credential?: string): Promise<boolean> => {
      if (credential !== undefined && credential.trim().length === 0) {
        return false;
      }
      return extendSession();
    },
    [extendSession],
  );

  // Sync serverExpiresAt changes when updated externally
  useEffect(() => {
    if (serverExpiresAt) {
      setExpiryDeadline(serverExpiresAt);
    }
  }, [serverExpiresAt]);

  const showWarningRef = useRef(showWarning);
  showWarningRef.current = showWarning;

  // Set up activity listeners and initial timer
  useEffect(() => {
    resetTimer();

    const handleActivity = () => {
      // Only reset timer on activity if modal is NOT showing
      // (when modal is showing, user must explicitly extend/re-auth)
      if (!showWarningRef.current) {
        resetTimer();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearAllTimers();
      syncDocumentLockBlur(false);
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, clearAllTimers]);

  const isLastMinute = secondsRemaining <= 60 && secondsRemaining > 0;

  return {
    showWarning,
    isLocked,
    secondsRemaining,
    isLastMinute,
    isExtending,
    dismissWarning,
    lockSession,
    extendSession,
    unlockSession,
  };
}

