import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { requireRoleFromCookies } from '@/lib/auth/requireRole';
import { AdminShell } from '@/components/layout/AdminShell';
import { ROUTES } from '@/lib/navigation/routes';
import { defaultLocale, isSupportedLocale, LOCALE_COOKIE } from '@/lib/i18n/locales';
import type { Locale } from '@/lib/i18n/locales';

// The role check reads request cookies, so this layout must never be
// statically prerendered or cached across users.
export const dynamic = 'force-dynamic';

async function resolveCurrentLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    if (isSupportedLocale(cookieLocale)) {
      return cookieLocale;
    }
  } catch {}

  try {
    const headerList = await headers();
    const candidates = [
      headerList.get('next-url'),
      headerList.get('x-url'),
      headerList.get('referer'),
    ];
    for (const candidate of candidates) {
      if (candidate) {
        const path = candidate.startsWith('http')
          ? new URL(candidate).pathname
          : candidate;
        const segment = path.split('/')[1];
        if (isSupportedLocale(segment)) {
          return segment;
        }
      }
    }
  } catch {}

  return defaultLocale;
}

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
    const locale = await resolveCurrentLocale();
    redirect(
      check.status === 401
        ? `/${locale}${ROUTES.LOGIN}`
        : `/${locale}${ROUTES.DASHBOARD}`
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
