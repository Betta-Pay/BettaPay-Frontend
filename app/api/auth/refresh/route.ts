import { NextResponse, NextRequest } from 'next/server';
import {
  generateCsrfToken,
  buildCsrfCookieHeader,
  buildCsrfSidCookieHeader,
  buildCsrfClearCookieHeaders,
  deriveCsrfBinding,
  sessionKeyFromAuthToken,
} from '@/lib/utils/csrf';

export const runtime = 'nodejs';

const SESSION_SECONDS = 1800; // 30 minutes, matching GET /api/auth/session

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * POST /api/auth/refresh — exchange the current session for a fresh access
 * token against the backend, then rotate the CSRF token/binding to match
 * (issues #486, #487).
 *
 * - Backend returns a new token  → set `auth_token`, return `{ ok, token }`
 *   so the client (axios single-flight, SessionTimeoutModal) can propagate it.
 * - Backend rejects the refresh token → 401 `{ ok:false, error:'session_expired' }`
 *   and every session cookie is cleared, so the client redirects to login once.
 * - Backend unreachable → fall back to extending the *existing* token's
 *   lifetime (previous behaviour) and flag `refreshed:false` so callers know
 *   it was not a real rotation.
 */
export async function POST(req: NextRequest) {
  const existingToken = req.cookies.get('auth_token')?.value;
  const role = req.cookies.get('user_role')?.value || 'merchant';
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction ? '; Secure' : '';

  if (!existingToken) {
    return NextResponse.json(
      { ok: false, error: 'session_expired' },
      { status: 401 },
    );
  }

  const base = apiBase();
  const isSelfLoop =
    base.includes('localhost:3000') || base.includes('127.0.0.1:3000');

  let newToken: string | null = null;
  let refreshed = false;

  if (!isSelfLoop) {
    try {
      const upstream = await fetch(`${base}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward the incoming cookies so the backend sees the refresh token.
          cookie: req.headers.get('cookie') ?? '',
        },
        body: JSON.stringify({ token: existingToken }),
        cache: 'no-store',
      });

      if (upstream.status === 401 || upstream.status === 403) {
        const res = NextResponse.json(
          { ok: false, error: 'session_expired' },
          { status: 401 },
        );
        res.headers.set('Set-Cookie', `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
        res.headers.append('Set-Cookie', `user_role=; Path=/; Max-Age=0; SameSite=Lax${secure}`);
        for (const h of buildCsrfClearCookieHeaders()) res.headers.append('Set-Cookie', h);
        return res;
      }

      if (upstream.ok) {
        const body = (await upstream.json().catch(() => ({}))) as {
          token?: unknown;
          accessToken?: unknown;
        };
        const t = body.token ?? body.accessToken;
        if (typeof t === 'string' && t.length > 0) {
          newToken = t;
          refreshed = true;
        }
      }
    } catch {
      // Backend offline — fall through to a local lifetime extension.
    }
  }

  const token = newToken ?? existingToken;
  const csrfToken = generateCsrfToken();
  const csrfBinding = deriveCsrfBinding(csrfToken, sessionKeyFromAuthToken(token));

  const res = NextResponse.json({
    ok: true,
    refreshed,
    token: refreshed ? token : undefined,
    expiresIn: SESSION_SECONDS,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  });

  res.headers.set(
    'Set-Cookie',
    `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`,
  );
  res.headers.append(
    'Set-Cookie',
    `user_role=${role}; Path=/; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`,
  );
  res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));
  res.headers.append('Set-Cookie', buildCsrfSidCookieHeader(csrfBinding));
  return res;
}
