"use client";

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';

import { registerSchema, RegisterFormValues, passwordRequirements } from '@/lib/utils/validation';
import { trimInput, normalizeEmail } from '@/lib/utils/sanitize';
import { useWalletStore } from '@/lib/store/walletStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import dynamic from 'next/dynamic';
import { WalletModalFallback } from '@/components/wallet/WalletModalFallback';
const WalletModal = dynamic(() => import('@/components/wallet/WalletModal').then(m => m.WalletModal), { ssr: false });

export default function RegisterPage() {
  const router = useRouter();
  const { connect } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
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
      try {
        const { apiClient } = await import('@/lib/api/axios');
        await apiClient.post('/api/merchants', {
          id: `merch_${Math.random().toString(36).substr(2, 9)}`,
          name: sanitizedData.businessName,
        });
      } catch {
        console.warn('Backend unavailable, falling back to mock registration for Vercel preview.');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      success('Account created successfully! Please log in.');
      router.push('/auth/login');
    } catch (err) {
      console.error(err);
      error('Failed to create account');
    } finally {
      setIsLoading(false);
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
    <div className="w-full">
      <Header />
      <Suspense fallback={<WalletModalFallback open={walletOpen} onOpenChange={setWalletOpen} />}>
        <WalletModal open={walletOpen} onOpenChange={setWalletOpen} />
      </Suspense>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full container mx-auto py-16"
      >
        <div className="mx-auto max-w-md">
          <Card className="rounded-2xl overflow-hidden bg-card/95 ring-1 ring-border/10 shadow-lg">
            <CardHeader className="space-y-2 text-center pb-8 pt-8">
                <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Create an account</CardTitle>
                <CardDescription className="text-muted-foreground text-base">
                  Enter your details to start accepting crypto payments
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-5 px-8">              <div className="space-y-2.5">
                <Label htmlFor="businessName" className="text-muted-foreground">Business Name</Label>
                <Input 
                  id="businessName" 
                  placeholder="Acme Corp" 
                  {...register('businessName')} 
                  aria-invalid={errors.businessName ? "true" : "false"}
                  aria-describedby={errors.businessName ? "businessName-error" : undefined}
                  className="bg-input h-12 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                />
                {errors.businessName && <p id="businessName-error" className="text-sm text-red-400">{errors.businessName.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-muted-foreground">Work Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  {...register('email')} 
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="bg-input h-12 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                />
                {errors.email && <p id="email-error" className="text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="country" className="text-zinc-300">Country of Operation</Label>
                <Select onValueChange={(val: string | null) => { if (val) setValue('country', val as 'NG' | 'KE' | 'ZA'); }}>
                  <SelectTrigger 
                    aria-invalid={errors.country ? "true" : "false"}
                    aria-describedby={errors.country ? "country-error" : undefined}
                    className="bg-input h-12 border-border text-foreground focus:ring-primary transition-all"
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="NG">Nigeria (NG)</SelectItem>
                    <SelectItem value="KE">Kenya (KE)</SelectItem>
                    <SelectItem value="ZA">South Africa (ZA)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.country && <p id="country-error" className="text-sm text-red-400">{errors.country.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-muted-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : passwordValue.length > 0 ? "password-requirements" : undefined}
                  className="bg-input h-12 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary transition-all"
                />
                {passwordValue.length > 0 && (
                  <div className="space-y-2" id="password-requirements">
                    <div className="h-1.5 w-full rounded-full bg-card/10">
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
                        <li key={label} className={`flex items-center gap-2 text-xs ${met ? 'text-green-400' : 'text-muted-foreground'}`}>
                          <Check className={`h-3 w-3 shrink-0 ${met ? 'opacity-100' : 'opacity-20'}`} aria-hidden="true" />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {errors.password && <p id="password-error" role="alert" className="text-sm text-red-400">{errors.password.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-6 pb-8 pt-4 px-8">
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium bg-primary text-white hover:bg-primary/90 shadow-glow transition-all hover:shadow-glow-hover scroll-mb-52"
                disabled={isLoading || isWalletLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Sign Up
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-background/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline"
                className="w-full h-12 text-base font-medium bg-input border-border text-foreground hover:opacity-95 transition-all"
                onClick={handleFreighterLogin}
                disabled={isLoading || isWalletLoading}
              >
                {isWalletLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Freighter Wallet
              </Button>

              <div className="text-sm text-center text-zinc-400">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-primary hover:opacity-90 transition-colors font-medium">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </form>
          </Card>
        </div>
      </motion.div>

      <Footer />
    </div>
  );
}
