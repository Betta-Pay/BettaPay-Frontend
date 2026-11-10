"use client";

import { useState, useId, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { ROUTES } from '@/lib/navigation/routes';

const COOLDOWN_DURATION_SECONDS = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState = 'form' | 'confirmation';

type SubmitError =
  | 'invalidEmail'
  | 'tooManyRequests'
  | 'generic'
  | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const { t } = useAppTranslation();

  const [pageState, setPageState] = useState<PageState>('form');
  const [email, setEmail] = useState('');
  const [submitError, setSubmitError] = useState<SubmitError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailId = useId();
  const errorId = useId();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // ── Basic client-side email format check ──────────────────────────────────
  const isEmailValid = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  async function requestPasswordReset() {
    setSubmitError(null);

    if (cooldownSeconds > 0) {
      return;
    }

    if (!isEmailValid(email)) {
      setSubmitError('invalidEmail');
      emailInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.status === 429) {
        setSubmitError('tooManyRequests');
        setCooldownSeconds(COOLDOWN_DURATION_SECONDS);
        return;
      }

      if (!res.ok) {
        setSubmitError('generic');
        return;
      }

      // Start 60-second cooldown and show confirmation screen.
      setCooldownSeconds(COOLDOWN_DURATION_SECONDS);
      setPageState('confirmation');
    } catch {
      setSubmitError('generic');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await requestPasswordReset();
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (pageState === 'confirmation') {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
            aria-hidden="true"
          >
            <MailCheck className="w-7 h-7 text-primary" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {t('forgotPassword.confirmation.title')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {t('forgotPassword.confirmation.description')}
            </p>
          </div>

          {/* Resend button with 60s cooldown */}
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || cooldownSeconds > 0}
            onClick={() => void requestPasswordReset()}
            className="w-full max-w-xs"
          >
            {cooldownSeconds > 0
              ? `Resend in ${cooldownSeconds}s`
              : 'Resend reset link'}
          </Button>

          {/* Back link */}
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('forgotPassword.confirmation.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {t('forgotPassword.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t('forgotPassword.description')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate aria-label={t('forgotPassword.title')}>
        <div className="space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor={emailId}>
              {t('forgotPassword.emailLabel')}
            </Label>
            <Input
              ref={emailInputRef}
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // Clear field-level error as the user types
                if (submitError === 'invalidEmail') setSubmitError(null);
              }}
              aria-invalid={submitError === 'invalidEmail' ? true : undefined}
              aria-describedby={submitError ? errorId : undefined}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Error message */}
          {submitError && (
            <p
              id={errorId}
              role="alert"
              className="text-sm text-destructive"
            >
              {t(`forgotPassword.errors.${submitError}` as never)}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || cooldownSeconds > 0}
            className="w-full h-12"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('forgotPassword.submitting')}
              </>
            ) : cooldownSeconds > 0 ? (
              `${t('forgotPassword.submit')} (${cooldownSeconds}s)`
            ) : (
              t('forgotPassword.submit')
            )}
          </Button>
        </div>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
