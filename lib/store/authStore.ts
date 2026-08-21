import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoggedIn: boolean;
  twoFactorRequired: boolean;
  pendingTwoFactorSecret: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  setTwoFactorRequired: (required: boolean, secret?: string) => void;
  enableTwoFactor: (secret: string) => void;
  disableTwoFactor: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
      isLoggedIn: false,
      twoFactorRequired: false,
      pendingTwoFactorSecret: null,
      login: (token, user) => set({ user, token, role: user.role, isAuthenticated: true, isLoggedIn: true }),
      logout: () => {
        set({ user: null, token: null, role: null, isAuthenticated: false, isLoggedIn: false, twoFactorRequired: false, pendingTwoFactorSecret: null });
        // Ask backend to clear the auth cookie (best-effort, backend may not exist in this demo)
        if (typeof window !== 'undefined') {
          fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' }).catch(() => {});
        }
      },
      setTwoFactorRequired: (required, secret) => set({ twoFactorRequired: required, pendingTwoFactorSecret: secret || null }),
      enableTwoFactor: (secret) => set((state) => ({ 
        user: state.user ? { ...state.user, twoFactorEnabled: true, twoFactorSecret: secret } : null,
        twoFactorRequired: false,
        pendingTwoFactorSecret: null
      })),
      disableTwoFactor: () => set((state) => ({ 
        user: state.user ? { ...state.user, twoFactorEnabled: false, twoFactorSecret: undefined } : null
      })),
    }),
    {
      name: 'bp-session',
      // Persist only a non-sensitive flag. Token, user, and role are kept in memory only.
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn }),
    }
  )
);
