"use client";

import { useState, useId, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { ROUTES } from '@/lib/navigation/routes';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageState = 'form' | 'success';

type SubmitError =
  | 'tokenExpired'
  | 'tokenInvalid'
  | 'passwordMismatch'
  | 'passwordWeak'
  | 'tooManyRequests'
  | 'generic'
  | null;

// ─── Password requirements ───────────────────────────────────────────────────

interface PasswordRequirement {
  key: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { key: 'minLength', test: (pw) => pw.length >= 8 },
  { key: 'uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { key: 'lowercase', test: (pw) => /[a-z]/.test(pw) },
  { key: 'number', test: (pw) => /[0-9]/.test(pw) },
  { key: 'special', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const { t } = useAppTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [pageState, setPageState] = useState<PageState>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const passwordId = useId();
  const confirmId = useId();
  const errorId = useId();
  const requirementsId = useId();

  // ── Password strength evaluation ─────────────────────────────────────────
  const requirementsMet = useMemo(
    () => PASSWORD_REQUIREMENTS.map((req) => ({
      ...req,
      met: req.test(password),
    })),
    [password],
  );

  const allRequirementsMet = useMemo(
    () => requirementsMet.every((r) => r.met),
    [requirementsMet],
  );

  // ── Form submission ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitError(null);

      // Client-side validation
      if (!allRequirementsMet) {
        setSubmitError('passwordWeak');
        passwordInputRef.current?.focus();
        return;
      }

      if (password !== confirmPassword) {
        setSubmitError('passwordMismatch');
        confirmInputRef.current?.focus();
        return;
      }

      if (!token) {
        setSubmitError('tokenInvalid');
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });

        if (res.status === 429) {
          setSubmitError('tooManyRequests');
          return;
        }

        if (res.status === 410) {
          setSubmitError('tokenExpired');
          return;
        }

        if (res.status === 400) {
          setSubmitError('tokenInvalid');
          return;
        }

        if (!res.ok) {
          setSubmitError('generic');
          return;
        }

        setPageState('success');
      } catch {
        setSubmitError('generic');
      } finally {
        setIsSubmitting(false);
      }
    },
    [allRequirementsMet, confirmPassword, password, token],
  );

  // ── Success screen ────────────────────────────────────────────────────────
  if (pageState === 'success') {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
            aria-hidden="true"
          >
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {t('resetPassword.success.title')}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              {t('resetPassword.success.description')}
            </p>
          </div>

          {/* Sign in link */}
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors mt-2"
          >
            {t('resetPassword.success.loginLink')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Missing token screen ──────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {t('resetPassword.errors.tokenInvalid')}
            </h1>
          </div>

          <Link
            href={ROUTES.FORGOT_PASSWORD}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('forgotPassword.title')}
          </Link>
        </div>
      </div>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {t('resetPassword.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {t('resetPassword.description')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate aria-label={t('resetPassword.title')}>
        <div className="space-y-5">
          {/* New password field */}
          <div className="space-y-2">
            <Label htmlFor={passwordId}>
              {t('resetPassword.newPasswordLabel')}
            </Label>
            <div className="relative">
              <Input
                ref={passwordInputRef}
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('resetPassword.newPasswordPlaceholder')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (submitError === 'passwordWeak') setSubmitError(null);
                }}
                aria-invalid={submitError === 'passwordWeak' ? true : undefined}
                aria-describedby={`${requirementsId}${submitError ? ` ${errorId}` : ''}`}
                disabled={isSubmitting}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Password requirements checklist */}
          <ul
            id={requirementsId}
            className="space-y-1.5"
            aria-label="Password requirements"
          >
            {requirementsMet.map((req) => (
              <li
                key={req.key}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  req.met ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {req.met ? (
                  <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                {t(`resetPassword.requirements.${req.key}` as never)}
              </li>
            ))}
          </ul>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor={confirmId}>
              {t('resetPassword.confirmPasswordLabel')}
            </Label>
            <div className="relative">
              <Input
                ref={confirmInputRef}
                id={confirmId}
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (submitError === 'passwordMismatch') setSubmitError(null);
                }}
                aria-invalid={submitError === 'passwordMismatch' ? true : undefined}
                aria-describedby={submitError ? errorId : undefined}
                disabled={isSubmitting}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {submitError && (
            <p
              id={errorId}
              role="alert"
              className="text-sm text-destructive"
            >
              {t(`resetPassword.errors.${submitError}` as never)}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('resetPassword.submitting')}
              </>
            ) : (
              t('resetPassword.submit')
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
