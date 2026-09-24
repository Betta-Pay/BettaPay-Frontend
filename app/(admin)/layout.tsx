import { redirect } from 'next/navigation';
import { requireRoleFromCookies } from '@/lib/auth/requireRole';
import { AdminShell } from '@/components/layout/AdminShell';

// The role check reads request cookies, so this layout must never be
// statically prerendered or cached across users.
export const dynamic = 'force-dynamic';

/**
 * Server-side gate for every admin page (issue #776).
 *
 * The role is confirmed against the backend session for the `auth_token`
 * cookie before anything renders. Non-admins are redirected from the server,
 * so they never see a flash of admin UI and never download the admin shell —
 * even with JavaScript disabled. The middleware redirect is only a UX hint.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const check = await requireRoleFromCookies('admin');

  if (!check.ok) {
    redirect(check.status === 401 ? '/auth/login' : '/dashboard');
  }

  return <AdminShell>{children}</AdminShell>;
}
