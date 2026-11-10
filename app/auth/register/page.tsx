"use client";

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Circle, Loader2 } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { useNotify } from '@/lib/hooks/useNotify';
import { announce } from '@/lib/utils/announce';
import { ROUTES } from '@/lib/navigation/routes';

export default function RegisterPage() {
  const router = useRouter();
  const notify = useNotify();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordRules = useMemo(
    () => [
      { id: 'length', label: '8+ characters', met: password.length >= 8 },
      { id: 'uppercase', label: 'Uppercase letter', met: /[A-Z]/.test(password) },
      { id: 'number', label: 'Number', met: /[0-9]/.test(password) },
      { id: 'symbol', label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  const passedRulesCount = passwordRules.filter((r) => r.met).length;
  const allPasswordRulesMet = passedRulesCount === passwordRules.length;
  const strengthLabel =
    passedRulesCount === 0
      ? 'None'
      : passedRulesCount <= 1
        ? 'Weak'
        : passedRulesCount <= 3
          ? 'Medium'
          : 'Strong';
  const strengthColor =
    passedRulesCount <= 1
      ? 'bg-destructive'
      : passedRulesCount <= 3
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  const strengthPercent = (passedRulesCount / passwordRules.length) * 100;

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
    } else if (!allPasswordRulesMet) {
      newErrors.password = 'Password must meet all strength requirements';
      if (!firstErrorField) {
        firstErrorField = passwordInputRef.current;
        firstErrorMessage = 'Password must meet all strength requirements';
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
      // Create session or simulate registration
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: `mock_jwt_register_${Date.now()}` }),
      });

      if (res.ok) {
        notify.success('Account created successfully');
        router.push(ROUTES.DASHBOARD);
      } else {
        notify.error('Could not complete registration. Please try again.');
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

          {/* Password Strength Meter & Live Checklist */}
          <div className="pt-2 space-y-2" data-testid="password-strength-meter">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Password strength</span>
              <span className="font-semibold text-foreground" data-testid="password-strength-label">
                {strengthLabel}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Password strength"
              aria-valuenow={strengthPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            >
              <div
                className={`h-full transition-all duration-300 ${strengthColor}`}
                style={{ width: `${strengthPercent}%` }}
              />
            </div>
            <ul className="grid grid-cols-2 gap-1.5 pt-1 text-xs" aria-label="Password requirements">
              {passwordRules.map((rule) => (
                <li
                  key={rule.id}
                  data-testid={`rule-${rule.id}`}
                  data-met={rule.met ? 'true' : 'false'}
                  className={`flex items-center gap-1.5 ${rule.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}
                >
                  {rule.met ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden="true" />
                  )}
                  <span>{rule.label}</span>
                </li>
              ))}
            </ul>
          </div>
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
          disabled={isSubmitting || !allPasswordRulesMet}
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

