"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { success } = useNotify();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      // Mock reset request behavior
      await new Promise(resolve => setTimeout(resolve, 1500));
      success('If an account exists, a password reset link has been sent.');
      router.push('/auth/login');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Heading */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-amber-500 uppercase mb-3">Recovery</p>
        <h1 className="text-4xl font-bold text-slate-900 leading-tight">Reset your<br />password</h1>
        <p className="text-slate-400 mt-3 text-sm">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-amber-600 font-semibold hover:text-amber-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "email-error" : undefined}
            className="h-12 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:border-amber-400 transition-all"
          />
          {error && <p id="email-error" className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Submit CTA */}
        <div className="pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl border-0 transition-colors scroll-mb-52"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send Reset Link
          </Button>
        </div>
      </form>
    </div>
  );
}
