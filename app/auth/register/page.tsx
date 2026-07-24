"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/auth/login'); }, [router]);
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
      <span className="text-sm">Redirecting to sign in...</span>
    </div>
  );
}
