"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useNotify } from '@/lib/hooks/useNotify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useAuthStore();
  const router = useRouter();
  const { success, error } = useNotify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!user || !token) {
      error('Session expired, please log in again');
      router.push('/auth/login');
      return;
    }

    setIsLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/merchants/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update business name');
      }

      success('Business name saved successfully!');
      router.push(user.role === 'admin' ? '/overview' : '/dashboard');
    } catch (err: any) {
      console.error(err);
      error(err.message || 'Failed to save business name');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to BettaPay</CardTitle>
          <CardDescription>
            Let's get started. What is the name of your business?
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="e.g. Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                minLength={2}
                autoFocus
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || name.trim().length < 2}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue to Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
