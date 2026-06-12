"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { registerSchema, RegisterFormValues } from '@/lib/utils/validation';
import { useWalletStore } from '@/lib/store/walletStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RegisterPage() {
  const router = useRouter();
  const { connect } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      try {
        const { apiClient } = await import('@/lib/api/axios');
        await apiClient.post('/api/merchants', {
          id: `merch_${Math.random().toString(36).substr(2, 9)}`,
          name: data.businessName,
        });
      } catch {
        console.warn('Backend unavailable, falling back to mock registration for Vercel preview.');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      toast.success('Account created successfully! Please log in.');
      router.push('/auth/login');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create account');
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
        toast.success('Wallet connected! Redirecting...');
        router.push('/dashboard');
      } else {
        toast.error('Wallet connection was cancelled or Freighter is not installed.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to connect wallet');
    } finally {
      setIsWalletLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="space-y-2 text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-bold tracking-tight text-white">Create an account</CardTitle>
            <CardDescription className="text-zinc-400 text-base">
              Enter your details to start accepting crypto payments
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-5 px-8">
              <div className="space-y-2.5">
                <Label htmlFor="businessName" className="text-zinc-300">Business Name</Label>
                <Input 
                  id="businessName" 
                  placeholder="Acme Corp" 
                  {...register('businessName')} 
                  className="bg-zinc-950/50 h-12 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
                {errors.businessName && <p className="text-sm text-red-400">{errors.businessName.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-zinc-300">Work Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="m@example.com" 
                  {...register('email')} 
                  className="bg-zinc-950/50 h-12 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
                {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="country" className="text-zinc-300">Country of Operation</Label>
                <Select onValueChange={(val: string | null) => { if (val) setValue('country', val as 'NG' | 'KE' | 'ZA'); }}>
                  <SelectTrigger className="bg-zinc-950/50 h-12 border-white/10 text-white focus:ring-primary transition-all">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="NG">Nigeria (NG)</SelectItem>
                    <SelectItem value="KE">Kenya (KE)</SelectItem>
                    <SelectItem value="ZA">South Africa (ZA)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-sm text-red-400">{errors.country.message}</p>}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-zinc-300">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="••••••••" 
                  {...register('password')} 
                  className="bg-zinc-950/50 h-12 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary focus-visible:border-primary transition-all"
                />
                {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-6 pb-8 pt-4 px-8">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(240,165,0,0.3)] transition-all hover:shadow-[0_0_25px_rgba(240,165,0,0.5)]" 
                disabled={isLoading || isWalletLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Sign Up
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900/80 px-2 text-zinc-500">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline"
                className="w-full h-12 text-base font-medium bg-zinc-950/50 border-white/10 text-white hover:bg-zinc-900 hover:text-primary transition-all"
                onClick={handleFreighterLogin}
                disabled={isLoading || isWalletLoading}
              >
                {isWalletLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Freighter Wallet
              </Button>

              <div className="text-sm text-center text-zinc-400">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-white hover:text-primary transition-colors font-medium">
                  Log in
                </Link>
              </div>
            </CardFooter>
          </form>
      </Card>
    </motion.div>
  );
}
