"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button, Input } from '@/components/ui';
import { useNotify } from '@/lib/hooks/useNotify';
import { announce } from '@/lib/utils/announce';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';
import { ROUTES } from '@/lib/navigation/routes';

export function EmailLoginForm() {
  const { t } = useAppTranslation();
  const notify = useNotify();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isEmailValid = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleEmailLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      } else {
        notify.error('Failed to sign in. Please try again.');
      }
    } catch {
      notify.error('Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        disabled={isSubmitting}
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm"
      >
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Sign In with Email
      </Button>
    </form>
  );
}
