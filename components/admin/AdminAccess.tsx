'use client';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { useOfflineStore } from '@/lib/store/offlineStore';
import { Button } from '@/components/ui/button';

export function useAdminAccess() {
  return useAuthStore(s => s._hasHydrated && s.isAuthenticated && s.role === 'admin');
}
export function AdminAccess({ children }: { children: ReactNode }) {
  const hydrated = useAuthStore(s => s._hasHydrated);
  const allowed = useAdminAccess();
  if (!hydrated) return <p role="status">Loading session…</p>;
  if (!allowed) return <p role="alert">Administrator access required.</p>;
  return <>{children}</>;
}
export function useAdminOnline() {
  return useOfflineStore(s => s.isOnline && s.isApiReachable);
}
export function AdminState({ loading, error, empty, retry }: {
  loading: boolean; error: unknown; empty: boolean; retry: () => void;
}) {
  const online = useAdminOnline();
  if (!online) return <p role="status">You’re offline. Reconnect to load data and make changes.</p>;
  if (loading) return <p role="status">Loading…</p>;
  if (error) return <div role="alert">{error instanceof Error ? error.message : 'Unable to load data.'} <Button onClick={retry}>Retry</Button></div>;
  if (empty) return <p>No records match these filters.</p>;
  return null;
}
