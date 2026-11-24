"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { useNotify } from '@/lib/hooks/useNotify';
import { announce } from '@/lib/utils/announce';
import { ROUTES } from '@/lib/navigation/routes';

type RegisterResponse = {
  token?: unknown;
  accessToken?: unknown;
  data?: { token?: unknown; accessToken?: unknown };
  message?: string;
  error?: string;
};

/** Pull the JWT out of the backend's registration response, if it sent one. */
function extractToken(body: RegisterResponse): string | null {
  const candidates = [body.token, body.accessToken, body.data?.token, body.data?.accessToken];
  const token = candidates.find((t): t is string => typeof t === 'string' && t.length > 0);
  return token ?? null;
}

export default function RegisterPage() {
  const router = useRouter();
  const notify = useNotify();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    let firstErrorField: HTMLInputElement | null = null;
    let firstErrorMessage = '';

    if (!name.trim()) {
      newErrors.name = 'Full name is required';
      firstErrorField = nameInputRef.current;
      firstErrorMessage = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
      if (!firstErrorField) {
        firstErrorField = emailInputRef.current;
        firstErrorMessage = 'Email address is required';
      }
    } else if (!isEmailValid(email)) {
      newErrors.email = 'Please enter a valid email address';
      if (!firstErrorField) {
        firstErrorField = emailInputRef.current;
        firstErrorMessage = 'Please enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = 'Password is required';
      if (!firstErrorField) {
        firstErrorField = passwordInputRef.current;
        firstErrorMessage = 'Password is required';
      }
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      if (!firstErrorField) {
        firstErrorField = passwordInputRef.current;
        firstErrorMessage = 'Password must be at least 8 characters';
      }
    }

    if (password && confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
      if (!firstErrorField) {
        firstErrorField = confirmPasswordInputRef.current;
        firstErrorMessage = 'Passwords do not match';
      }
    }

    setErrors(newErrors);

    if (firstErrorField) {
      firstErrorField.focus();
      announce(firstErrorMessage);
      return;
    }

    setIsSubmitting(true);
    try {
      // Register against the backend, then open a session with the JWT it
      // issues (issue #1128). We never fabricate a token: if the backend
      // doesn't return one (e.g. email verification is required first), the
      // user is sent to sign in instead of getting a cookie that fails
      // verification on the very next API call.
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const registerRes = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const body = (await registerRes.json().catch(() => ({}))) as RegisterResponse;

      if (!registerRes.ok) {
        notify.error(
          registerRes.status === 409
            ? 'An account with this email already exists. Try signing in instead.'
            : body.message || body.error || 'Could not complete registration. Please try again.',
        );
        return;
      }

      const token = extractToken(body);
      if (!token) {
        notify.success('Account created. Check your email to verify your account, then sign in.');
        router.push(`${ROUTES.LOGIN}?registered=1&email=${encodeURIComponent(email.trim())}`);
        return;
      }

      // /api/auth/session is this app's own route (it sets same-origin cookies).
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });

      if (sessionRes.ok) {
        notify.success('Account created successfully');
        router.push(ROUTES.DASHBOARD);
      } else {
        notify.error('Your account was created, but we could not sign you in. Please sign in.');
        router.push(ROUTES.LOGIN);
      }
    } catch {
      notify.error('Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Create your account</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Start accepting and converting global stablecoin payments today.
        </p>
      </div>

      {/* Registration form */}
      <form onSubmit={handleSubmit} noValidate aria-label="Create account form" className="space-y-4">
        {/* Name input */}
        <div className="space-y-1">
          <label htmlFor="register-name" className="text-xs font-semibold text-foreground">
            Full Name
          </label>
          <Input
            ref={nameInputRef}
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            className="h-11 bg-card border-border rounded-xl text-sm"
            disabled={isSubmitting}
            required
          />
          {errors.name && (
            <p id="register-name-error" role="alert" className="text-xs text-destructive mt-0.5">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email input */}
        <div className="space-y-1">
          <label htmlFor="register-email" className="text-xs font-semibold text-foreground">
            Email address
          </label>
          <Input
            ref={emailInputRef}
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="merchant@bettapay.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            className="h-11 bg-card border-border rounded-xl text-sm"
            disabled={isSubmitting}
            required
          />
          {errors.email && (
            <p id="register-email-error" role="alert" className="text-xs text-destructive mt-0.5">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password input */}
        <div className="space-y-1">
          <label htmlFor="register-password" className="text-xs font-semibold text-foreground">
            Password
          </label>
          <Input
            ref={passwordInputRef}
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            className="h-11 bg-card border-border rounded-xl text-sm"
            disabled={isSubmitting}
            required
          />
          {errors.password && (
            <p id="register-password-error" role="alert" className="text-xs text-destructive mt-0.5">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password input */}
        <div className="space-y-1">
          <label htmlFor="register-confirm-password" className="text-xs font-semibold text-foreground">
            Confirm Password
          </label>
          <Input
            ref={confirmPasswordInputRef}
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
            className="h-11 bg-card border-border rounded-xl text-sm"
            disabled={isSubmitting}
            required
          />
          {errors.confirmPassword && (
            <p id="register-confirm-error" role="alert" className="text-xs text-destructive mt-0.5">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm mt-2"
        >
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Account
        </Button>
      </form>

      {/* Sign in link */}
      <div className="mt-6 text-center">
        <span className="text-xs text-muted-foreground">Already have an account? </span>
        <Link
          href={ROUTES.LOGIN}
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

