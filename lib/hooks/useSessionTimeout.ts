'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { csrfHeader } from '@/lib/utils/csrf';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const;

export interface UseSessionTimeoutOptions {
  /** Inactivity threshold in ms before showing warning (default: 25 min) */
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
  /** Seconds remaining in the grace period / session deadline */
  secondsRemaining: number;
  /** Whether currently in the final minute of the grace period */
  isLastMinute: boolean;
  /** Whether an extension request is in flight */
  isExtending: boolean;
  /** Dismiss the warning and reset the timer locally */
  dismissWarning: () => void;
  /** Call the backend refresh API to update the server authoritative deadline */
  extendSession: () => Promise<boolean>;
}

export function useSessionTimeout({
  timeoutMs = 25 * 60 * 1000,
  gracePeriodMs = 5 * 60 * 1000,
  serverExpiresAt = null,
  onTimeout,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.floor(gracePeriodMs / 1000)
  );
  const [isExtending, setIsExtending] = useState(false);
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
        onTimeoutRef.current();
      }
    };

    updateCountdown();
    if (graceRef.current) clearInterval(graceRef.current);
    graceRef.current = setInterval(updateCountdown, 1000);
  }, [gracePeriodMs, clearAllTimers]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(Math.floor(gracePeriodMs / 1000));

    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);
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
      ACTIVITY_EVENTS.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, clearAllTimers]);

  const isLastMinute = secondsRemaining <= 60 && secondsRemaining > 0;

  return {
    showWarning,
    secondsRemaining,
    isLastMinute,
    isExtending,
    dismissWarning,
    extendSession,
  };
}

