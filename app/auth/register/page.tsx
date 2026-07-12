"use client";

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Check, Copy, CheckCheck } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';

import { registerSchema, RegisterFormValues, passwordRequirements } from '@/lib/utils/validation';
import { trimInput, normalizeEmail } from '@/lib/utils/sanitize';
import { useWalletStore } from '@/lib/store/walletStore';
import { Button } from '@/components/ui/button';
import { Select, SelectItem, SelectValue } from '@/components/ui/select';
import { AuthLabel } from '@/components/auth/AuthLabel';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthSelectTrigger, AuthSelectContent } from '@/components/auth/AuthSelect';
import dynamic from 'next/dynamic';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const { connect } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  // After successful registration the backend returns a one-time secret.
  // We surface it in a modal so the user can copy it before proceeding.
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [createdMerchantId, setCreatedMerchantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { success, error } = useNotify();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    const sanitizedData = {
      ...data,
      businessName: trimInput(data.businessName),
      email: normalizeEmail(data.email),
    };
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://bettapay-backend.onrender.com';
      // Use plain fetch — /api/merchants requires a service JWT via fastify.authenticate.
      // For merchant self-registration we call it without auth; the backend must allow
      // this endpoint unauthenticated OR a separate /api/auth/register endpoint is needed.
      const merchantId = `G${crypto.randomUUID().replace(/-/g, '').toUpperCase().slice(0, 54)}`;
      const ownerId = sanitizedData.email;

      const res = await fetch(`${apiBase}/api/merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: merchantId,
          name: sanitizedData.businessName,
          ownerId,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        error(errBody?.message || errBody?.error || 'Failed to create account. Please try again.');
        return;
      }

      const body = await res.json();
      // Backend returns { success: true, merchant: {...}, secret: '...' }
      // The secret is shown ONCE — the user must save it to log in.
      setCreatedSecret(body.secret);
      setCreatedMerchantId(body.merchant?.id ?? merchantId);
    } catch (err) {
      console.error(err);
      error('Network error — unable to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFreighterLogin = async () => {
    setIsWalletLoading(true);
    try {
      await connect();
      const address = useWalletStore.getState().address;
      if (address) {
        success('Wallet connected! Redirecting...');
        router.push('/dashboard');
      } else {
        error('Wallet connection was cancelled or Freighter is not installed.');
      }
    } catch (err) {
      console.error(err);
      error('Failed to connect wallet');
    } finally {
      setIsWalletLoading(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Suspense fallback={<WalletModalFallback open={walletOpen} onOpenChange={setWalletOpen} />}>
        <WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
      </Suspense>

      {/* ── Secret reveal modal — shown after successful registration ── */}
      {createdSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-surface-xl space-y-4">
            <h2 className="text-lg font-bold text-foreground">Account Created! Save Your Secret Key</h2>
            <p className="text-sm text-muted-foreground">
              This key is shown <span className="text-destructive font-semibold">only once</span>. Copy it now — you&apos;ll need it every time you sign in.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Merchant ID</p>
              <p className="font-mono text-xs bg-muted px-3 py-2 rounded-lg break-all text-foreground select-all">{createdMerchantId}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secret Key</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs bg-muted px-3 py-2 rounded-lg break-all text-foreground flex-1 select-all">{createdSecret}</p>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="shrink-0 p-2 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                  aria-label="Copy secret key"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={!copied}
              onClick={() => router.push('/auth/login')}
              className="w-full h-11 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {copied ? 'I\'ve saved it — Go to Login' : 'Copy the key above to continue'}
            </button>
          </div>
        </div>
      )}

      {/* Heading */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Merchant Portal</p>
        <h1 className="text-4xl font-bold text-foreground leading-tight">Create your<br />account</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-semibold hover:text-primary transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Business Name */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="businessName">
            Business Name
          </AuthLabel>
          <AuthInput
            id="businessName"
            placeholder="Acme Corp"
            {...register('businessName')}
            aria-invalid={errors.businessName ? "true" : "false"}
            aria-describedby={errors.businessName ? "businessName-error" : undefined}
          />
          {errors.businessName && <p id="businessName-error" className="text-xs text-destructive mt-1">{errors.businessName.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="email">
            Work Email
          </AuthLabel>
          <AuthInput
            id="email"
            type="email"
            placeholder="name@company.com"
            {...register('email')}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <p id="email-error" className="text-xs text-destructive mt-1">{errors.email.message}</p>}
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="country">
            Country of Operation
          </AuthLabel>
          <Select onValueChange={(val) => { if (val) setValue('country', val as 'NG' | 'KE' | 'ZA'); }}>
            <AuthSelectTrigger
              aria-invalid={errors.country ? "true" : "false"}
              aria-describedby={errors.country ? "country-error" : undefined}
            >
              <SelectValue placeholder="Select country" />
            </AuthSelectTrigger>
            <AuthSelectContent>
              <SelectItem value="NG">Nigeria (NG)</SelectItem>
              <SelectItem value="KE">Kenya (KE)</SelectItem>
              <SelectItem value="ZA">South Africa (ZA)</SelectItem>
            </AuthSelectContent>
          </Select>
          {errors.country && <p id="country-error" className="text-xs text-destructive mt-1">{errors.country.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <AuthLabel htmlFor="password">
            Password
          </AuthLabel>
          <AuthInput
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "password-error" : passwordValue.length > 0 ? "password-requirements" : undefined}
          />
          {errors.password && <p id="password-error" role="alert" className="text-xs text-destructive mt-1">{errors.password.message}</p>}
        </div>

        {/* Password Requirements */}
        {passwordValue.length > 0 && (
          <div id="password-requirements" className="space-y-3">
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

        {/* Sign Up CTA */}
        <div className="pt-1">
          <AuthButton
            type="submit"
            disabled={isLoading || isWalletLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Account
          </AuthButton>
        </div>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-muted" />
        <span className="text-xs text-muted-foreground font-medium">or</span>
        <div className="flex-1 h-px bg-muted" />
      </div>

      {/* Wallet button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleFreighterLogin}
        disabled={isLoading || isWalletLoading}
        className="w-full h-12 bg-card border border-border text-foreground hover:bg-muted font-medium text-sm rounded-xl transition-colors"
      >
        {isWalletLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Freighter Wallet
      </Button>
    </div>
  );
}
