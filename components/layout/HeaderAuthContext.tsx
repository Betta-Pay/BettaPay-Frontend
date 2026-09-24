"use client";

import { createContext, useContext } from 'react';
import type { Role } from '@/lib/types';

/**
 * Auth state for the public marketing `Header` (issue #712).
 *
 * Resolved on the server by `app/(marketing)/layout.tsx` from the request
 * cookies, so the very first HTML already contains the right nav links — there
 * is no client-side auth probe and therefore no flash of logged-out links
 * before hydration. Only the facts the Header needs cross the server/client
 * boundary; the session token itself never does.
 */
export interface HeaderAuthState {
  isAuthenticated: boolean;
  role: Role | null;
}

const LOGGED_OUT: HeaderAuthState = { isAuthenticated: false, role: null };

const HeaderAuthContext = createContext<HeaderAuthState>(LOGGED_OUT);

export function HeaderAuthProvider({
  value,
  children,
}: {
  value: HeaderAuthState;
  children: React.ReactNode;
}) {
  return <HeaderAuthContext.Provider value={value}>{children}</HeaderAuthContext.Provider>;
}

/** Falls back to logged-out when rendered outside the marketing layout. */
export function useHeaderAuth(): HeaderAuthState {
  return useContext(HeaderAuthContext);
}
