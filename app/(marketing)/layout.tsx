import { cookies } from 'next/headers';
import { HeaderAuthProvider } from '@/components/layout/HeaderAuthContext';
import { getSessionFromCookies } from '@/lib/auth/session';

/**
 * Layout for the public marketing pages (landing, pricing, about, …).
 *
 * The route group does not change any URL. It exists so auth state for the
 * shared `Header` is resolved once, on the server, from the same cookie
 * contract the middleware uses (issue #712). `auth_token` / `user_role` are
 * HttpOnly, so the client cannot read them without a round trip — which is
 * exactly what caused logged-out links to flash before the logged-in state.
 *
 * Reading cookies opts these pages into dynamic rendering; that is the cost
 * of rendering the correct nav in the first byte.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = getSessionFromCookies(cookies());

  return (
    <HeaderAuthProvider value={{ isAuthenticated: session.isAuthenticated, role: session.role }}>
      {children}
    </HeaderAuthProvider>
  );
}
