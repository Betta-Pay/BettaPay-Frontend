"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Loader2, MailCheck } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const { error: notifyError } = useNotify();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      setEmail(data.email);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
      notifyError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Recovery</p>
          <h1 className="text-4xl font-bold text-foreground leading-tight">Check your email</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
            It may take a few minutes to arrive.
          </p>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="pt-1">
          <Link href="/auth/login">
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors">
              Back to Sign In
            </Button>
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
        <h1 className="text-4xl font-bold text-foreground leading-tight">Reset your<br />password</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:text-primary transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="h-12 bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring transition-all"
          />
          {error && <p id="email-error" className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        {/* Submit CTA */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send Reset Link
          </Button>
        </div>
      </form>
    </div>
  );
}
