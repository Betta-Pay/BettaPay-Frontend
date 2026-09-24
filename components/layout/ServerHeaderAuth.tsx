import { cookies } from 'next/headers';
import { HeaderAuthProvider } from '@/components/layout/HeaderAuthContext';
import { getSessionFromCookies } from '@/lib/auth/session';

/**
 * Server component that resolves auth state for the public `Header` from the
 * request cookies (issue #712), using the same `getSessionFromCookies()`
 * contract as the middleware. `auth_token` / `user_role` are HttpOnly, so the
 * client cannot read them without a round trip — which is exactly what caused
 * logged-out links to flash before the logged-in state.
 *
 * Use it from the layout of any route that renders `Header`. Reading cookies
 * opts those routes into dynamic rendering; that is the cost of rendering the
 * correct nav in the first byte.
 */
export function ServerHeaderAuth({ children }: { children: React.ReactNode }) {
  const session = getSessionFromCookies(cookies());

  return (
    <HeaderAuthProvider value={{ isAuthenticated: session.isAuthenticated, role: session.role }}>
      {children}
    </HeaderAuthProvider>
  );
}
