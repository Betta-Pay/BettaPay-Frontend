"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Loader2, Check, CheckCircle2, XCircle } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import { strongPasswordSchema, passwordRequirements } from '@/lib/utils/validation';

import { AuthLabel } from '@/components/auth/AuthLabel';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton } from '@/components/auth/AuthButton';

const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type TokenState = 'validating' | 'valid' | 'invalid';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { success, error } = useNotify();

  const [tokenState, setTokenState] = useState<TokenState>('validating');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const passwordValue = watch('password') ?? '';
  const metRequirements = passwordRequirements.map(({ regex, label }) => ({
    label,
    met: regex.test(passwordValue),
  }));
  const strengthScore = metRequirements.filter((r) => r.met).length;
  const strengthPercent = (strengthScore / passwordRequirements.length) * 100;
  const strengthColor =
    strengthScore <= 1 ? 'bg-destructive' :
    strengthScore <= 2 ? 'bg-orange-500' :
    strengthScore <= 3 ? 'bg-yellow-500' :
    strengthScore <= 4 ? 'bg-blue-500' : 'bg-success';

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          setTokenState('valid');
        } else {
          setTokenState('invalid');
        }
      } catch {
        // If backend is unavailable (Vercel preview), accept the token for mock flow
        if (token.length > 0) {
          setTokenState('valid');
        } else {
          setTokenState('invalid');
        }
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });
      setIsSubmitted(true);
      success('Password reset successful');
    } catch (err) {
      console.error(err);
      error('Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Recovery</p>
          <h1 className="text-4xl font-bold text-foreground leading-tight">Password reset<br />successful</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Your password has been updated. You can now sign in with your new password.
          </p>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className="pt-1">
          <Link href="/auth/login">
            <AuthButton>
              Sign In
            </AuthButton>
          </Link>
        </div>
      </div>
    );
  }

  if (tokenState === 'validating') {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (tokenState === 'invalid' || !token) {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Recovery</p>
          <h1 className="text-4xl font-bold text-foreground leading-tight">Invalid or expired<br />reset link</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="pt-1">
          <Link href="/auth/forgot-password">
            <AuthButton>
              Request New Reset Link
            </AuthButton>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Heading */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Recovery</p>
        <h1 className="text-4xl font-bold text-foreground leading-tight">Set your new<br />password</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Must be at least 8 characters with uppercase, lowercase, number, and special character.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Password */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="password">
            New Password
          </AuthLabel>
          <AuthInput
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : passwordValue.length > 0 ? "password-requirements" : undefined}
          />
          {passwordValue.length > 0 && (
            <div className="space-y-2" id="password-requirements">
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${strengthColor}`}
                  style={{ width: `${strengthPercent}%` }}
                  role="progressbar"
                  aria-valuenow={strengthScore}
                  aria-valuemin={0}
                  aria-valuemax={passwordRequirements.length}
                  aria-label="Password strength"
                />
              </div>
              <ul className="space-y-1" aria-label="Password requirements">
                {metRequirements.map(({ label, met }) => (
                  <li key={label} className={`flex items-center gap-2 text-xs ${met ? 'text-success' : 'text-muted-foreground'}`}>
                    <Check className={`h-3 w-3 shrink-0 ${met ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="confirmPassword">
            Confirm New Password
          </AuthLabel>
          <AuthInput
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register('confirmPassword')}
            aria-invalid={errors.confirmPassword ? "true" : "false"}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {errors.confirmPassword && <p id="confirm-password-error" role="alert" className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit CTA */}
        <div className="pt-1">
          <AuthButton
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset Password
          </AuthButton>
        </div>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
