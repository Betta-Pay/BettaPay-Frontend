"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Copy, Check, Loader2 } from 'lucide-react';
import QRCode from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/authStore';
import { useAppTranslation } from '@/lib/i18n/useAppTranslation';

export default function TwoFactorEnrollPage() {
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, enableTwoFactor } = useAuthStore();
  
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate TOTP secret on mount
  useEffect(() => {
    const generateSecret = async () => {
      try {
        const response = await fetch('/api/auth/two-factor/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate 2FA secret');
        }
        
        const data = await response.json();
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
      } catch (err) {
        setError('Failed to generate 2FA secret. Please try again.');
      } finally {
        setIsGenerating(false);
      }
    };
    
    generateSecret();
  }, []);

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode, secret }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      enableTwoFactor(secret);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('twoFactor.enroll.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('twoFactor.enroll.description')}</p>
      </div>

      {/* QR Code */}
      {qrCodeUrl && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCode value={qrCodeUrl} size={200} level="M" />
            </div>
          </div>
          
          {/* Manual Entry */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">{t('twoFactor.enroll.manualEntry')}</p>
            <div className="flex items-center gap-2">
              <Input
                value={secret}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="text-sm font-medium text-foreground">
            {t('twoFactor.enroll.enterCode')}
          </label>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
          disabled={verificationCode.length !== 6 || isVerifying}
          className="w-full"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('twoFactor.enroll.verifying')}
            </>
          ) : (
            <>
              {t('twoFactor.enroll.verifyAndEnable')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {/* Skip for now */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push('/dashboard')}
        className="w-full text-muted-foreground hover:text-foreground"
      >
        {t('twoFactor.enroll.skip')}
      </Button>
    </div>
  );
}
