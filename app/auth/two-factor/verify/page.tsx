"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/authStore';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

export default function TwoFactorVerifyPage() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { login, twoFactorRequired, pendingTwoFactorSecret } = useAuthStore();
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/two-factor/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      const { token, user } = await response.json();
      login(token, user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!twoFactorRequired) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('twoFactor.verify.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('twoFactor.verify.description')}</p>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            {t('twoFactor.verify.enterCode')}
          </label>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-2xl tracking-widest font-mono"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <Button
          type="submit"
          disabled={code.length !== 6 || isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('twoFactor.verify.verifying')}
            </>
          ) : (
            t('twoFactor.verify.verify')
          )}
        </Button>
      </form>

      {/* Back to login */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push('/auth/login')}
        className="w-full text-muted-foreground hover:text-foreground"
      >
        {t('twoFactor.verify.backToLogin')}
      </Button>
    </div>
  );
}
