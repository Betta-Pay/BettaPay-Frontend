"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { useNotify } from '@/lib/hooks/useNotify';
import { announce } from '@/lib/utils/announce';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { ROUTES } from '@/lib/navigation/routes';

const DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS = 60;

export interface EmailLoginFormProps {
  initialCooldownSeconds?: number;
}

function extractRetrySecondsFromValue(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
    return Math.ceil(val);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const numeric = Number(trimmed);
    if (trimmed !== '' && Number.isFinite(numeric) && numeric > 0) {
      return Math.ceil(numeric);
    }
    const match = trimmed.match(/(?:in|after)\s+(\d+)\s*s(?:ec(?:ond)?s?)?/i) ??
      trimmed.match(/\b(\d+)\s*s(?:ec(?:ond)?s?)?\b/i);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.ceil(parsed);
      }
    }
  }
  return null;
}

export function parseRateLimitRetrySeconds(
  res?: { status?: number; headers?: { get?: (name: string) => string | null } } | null,
  payload?: unknown,
): number {
  const headerVal =
    res?.headers?.get?.('Retry-After') ?? res?.headers?.get?.('retry-after');
  const fromHeader = extractRetrySecondsFromValue(headerVal);
  if (fromHeader !== null) {
    return fromHeader;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['retryAfter', 'retryAfterSeconds', 'retry_after']) {
      const parsed = extractRetrySecondsFromValue(record[key]);
      if (parsed !== null) {
        return parsed;
      }
    }
    for (const key of ['message', 'error']) {
      const parsed = extractRetrySecondsFromValue(record[key]);
      if (parsed !== null) {
        return parsed;
      }
    }
  } else {
    const fromPayload = extractRetrySecondsFromValue(payload);
    if (fromPayload !== null) {
      return fromPayload;
    }
  }

  return DEFAULT_RATE_LIMIT_COOLDOWN_SECONDS;
}

export function EmailLoginForm({ initialCooldownSeconds = 0 }: EmailLoginFormProps = {}) {
  const { t } = useAppTranslation();
  const notify = useNotify();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(
    initialCooldownSeconds > 0 ? Math.ceil(initialCooldownSeconds) : 0,
  );

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleEmailLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || cooldownSeconds > 0) {
      return;
    }

    setEmailError('');
    setPasswordError('');

    let firstErrorField: HTMLInputElement | null = null;
    let errorMessage = '';

    if (!email.trim()) {
      setEmailError('Email address is required');
      firstErrorField = emailInputRef.current;
      errorMessage = 'Email address is required';
    } else if (!isEmailValid(email)) {
      setEmailError('Please enter a valid email address');
      firstErrorField = emailInputRef.current;
      errorMessage = 'Please enter a valid email address';
    }

    if (!password) {
      setPasswordError('Password is required');
      if (!firstErrorField) {
        firstErrorField = passwordInputRef.current;
        errorMessage = 'Password is required';
      }
    }

    if (firstErrorField) {
      firstErrorField.focus();
      announce(errorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: `mock_jwt_email_${Date.now()}` }),
      });
      if (res.ok) {
        window.location.href = ROUTES.DASHBOARD;
      } else if (res.status === 429) {
        let errorBody: unknown = null;
        if (typeof res.json === 'function') {
          try {
            errorBody = await res.json();
          } catch {
            errorBody = null;
          }
        }
        const retrySeconds = parseRateLimitRetrySeconds(res, errorBody);
        setCooldownSeconds(retrySeconds);
        notify.error(`Too many failed attempts. Try again in ${retrySeconds}s.`);
      } else {
        notify.error('Failed to sign in. Please try again.');
      }
    } catch (err) {
      const errObj = err as Record<string, unknown> | null;
      const status =
        typeof errObj?.status === 'number'
          ? errObj.status
          : typeof (errObj?.response as Record<string, unknown> | undefined)?.status === 'number'
            ? ((errObj?.response as Record<string, unknown>).status as number)
            : undefined;
      const isRateLimited =
        status === 429 ||
        typeof errObj?.retryAfter === 'number' ||
        typeof errObj?.retryAfterSeconds === 'number' ||
        (err instanceof Error && /429|rate.?limit|too many/i.test(err.message));

      if (isRateLimited) {
        const retrySeconds = parseRateLimitRetrySeconds(null, err);
        setCooldownSeconds(retrySeconds);
        notify.error(`Too many failed attempts. Try again in ${retrySeconds}s.`);
      } else {
        notify.error('Failed to sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCoolingDown = cooldownSeconds > 0;

  return (
    <form
      onSubmit={handleEmailLoginSubmit}
      noValidate
      className="space-y-3 pt-2"
      aria-label="Sign in with email and password"
    >
      <div className="space-y-1">
        <label htmlFor="login-email" className="text-xs font-semibold text-foreground">
          Email address
        </label>
        <Input
          ref={emailInputRef}
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="merchant@bettapay.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError('');
          }}
          aria-invalid={Boolean(emailError)}
          aria-describedby={emailError ? 'login-email-error' : undefined}
          className="h-11 bg-card border-border rounded-xl text-sm"
          disabled={isSubmitting}
        />
        {emailError && (
          <p id="login-email-error" role="alert" className="text-xs text-destructive mt-0.5">
            {emailError}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-xs font-semibold text-foreground">
            Password
          </label>
          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>
        <Input
          ref={passwordInputRef}
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError('');
          }}
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? 'login-password-error' : undefined}
          className="h-11 bg-card border-border rounded-xl text-sm"
          disabled={isSubmitting}
        />
        {passwordError && (
          <p id="login-password-error" role="alert" className="text-xs text-destructive mt-0.5">
            {passwordError}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || isCoolingDown}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm"
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isCoolingDown ? `Try again in ${cooldownSeconds}s` : 'Sign In with Email'}
      </Button>
    </form>
  );
}

