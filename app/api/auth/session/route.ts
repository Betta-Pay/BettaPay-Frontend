import { NextResponse, NextRequest } from 'next/server';
import { generateCsrfToken, buildCsrfCookieHeader } from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const role = req.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // In production, validate the token and fetch real user data.
  // For mock/preview mode, return a session based on the cookie values.
  return NextResponse.json({
    user: {
      id: role === 'admin' ? 'admin-1' : 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: role === 'admin' ? 'admin@bettapay.com' : 'merchant@bettapay.com',
      name: role === 'admin' ? 'System Admin' : 'Merchant User',
      role: role || 'merchant',
    },
    token,
    expiresAt: Date.now() + 1800 * 1000,
    expiresIn: 1800,
  });
}

/**
 * Roles this app understands. Anything else is treated as least privilege.
 */
const KNOWN_ROLES: ReadonlySet<string> = new Set(['admin', 'merchant']);

/** Least-privilege default when the backend has not confirmed a role. */
const FALLBACK_ROLE = 'merchant';

function normalizeRole(role: unknown): string {
  return typeof role === 'string' && KNOWN_ROLES.has(role) ? role : FALLBACK_ROLE;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;

    // The role is deliberately NOT read from the request body. It used to be,
    // which meant a caller could mint a `user_role=admin` cookie simply by
    // asking for one — the middleware trusts that cookie for route access.
    // The backend is the only thing allowed to say what a token is worth.
    let role = FALLBACK_ROLE;
    let confirmedByBackend = false;
    let revokedSessionCount: number | undefined;

    const upstreamBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Guard: if the upstream URL points back at this very Next.js server
    // (localhost:3000) skip the upstream call — it would loop back to this
    // same handler. Fall through to the mock/local path below.
    const isSelfLoop =
      upstreamBase.includes('localhost:3000') || upstreamBase.includes('127.0.0.1:3000');

    if (!isSelfLoop) {
      try {
        const upstreamResponse = await fetch(
          `${upstreamBase}/api/auth/session`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            cache: 'no-store',
          },
        );

        if (upstreamResponse.ok) {
          const upstreamBody = (await upstreamResponse.json()) as {
            revokedSessionCount?: unknown;
            role?: unknown;
            user?: { role?: unknown };
          };
          if (typeof upstreamBody.revokedSessionCount === 'number') {
            revokedSessionCount = upstreamBody.revokedSessionCount;
          }
          role = normalizeRole(upstreamBody.role ?? upstreamBody.user?.role);
          confirmedByBackend = true;
        } else if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
          // The backend rejected the token outright — do not set any cookie.
          return NextResponse.json(
            { ok: false, error: 'Invalid session token' },
            { status: 401 },
          );
        }
      } catch {
        // Local cookie setup remains available when the auth service is offline,
        // but the session is capped at the least-privilege role.
      }
    } else {
      // Local / mock mode: decode the role directly from the token payload
      // without verifying the signature (client already did structural checks).
      try {
        const payloadB64 = token.split('.')[1];
        if (payloadB64) {
          const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          role = normalizeRole(decoded.role);
        }
      } catch {
        // keep FALLBACK_ROLE
      }
      confirmedByBackend = false;
    }


    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    // Rotate the CSRF token on every login — this is the primary token rotation
    // point. A fresh token is tied to the new authenticated session.
    const csrfToken = generateCsrfToken();

    const res = NextResponse.json({ ok: true, revokedSessionCount, role, confirmedByBackend });

    // auth_token: HttpOnly so JS cannot read it (XSS protection)
    res.headers.set(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // user_role: HttpOnly (issue #492) — the middleware and route handlers
    // read it server-side via `req.cookies`; JS must not be able to forge it.
    // Client code that needs the role reads it from `GET /api/auth/session`.
    res.headers.append(
      'Set-Cookie',
      `user_role=${role}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // csrf_token: non-HttpOnly (JS must read it), SameSite=Strict
    res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));

    return res;
  } catch (error) {
    console.error('Failed to set session:', error);
    return NextResponse.json({ ok: false, error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';

  const res = NextResponse.json({ ok: true });
  // Expire all three cookies atomically on logout
  res.headers.set(
    'Set-Cookie',
    `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `user_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `csrf_token=; Path=/; Max-Age=0; SameSite=Strict${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `merchant_onboarded=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  return res;
}
import { NextResponse, NextRequest } from 'next/server';
import {
  generateCsrfToken,
  buildCsrfCookieHeader,
  buildCsrfSidCookieHeader,
  buildCsrfClearCookieHeaders,
  deriveCsrfBinding,
  sessionKeyFromAuthToken,
} from '@/lib/utils/csrf';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const role = req.cookies.get('user_role')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  // In production, validate the token and fetch real user data.
  // For mock/preview mode, return a session based on the cookie values.
  return NextResponse.json({
    user: {
      id: role === 'admin' ? 'admin-1' : 'GCCHHKNI7GRA5QWC7RCTT3OHO7SKAUMKQA6IBWEQEO2SXI3GF376UHDD',
      email: role === 'admin' ? 'admin@bettapay.com' : 'merchant@bettapay.com',
      name: role === 'admin' ? 'System Admin' : 'Merchant User',
      role: role || 'merchant',
    },
    token,
    expiresAt: Date.now() + 1800 * 1000,
    expiresIn: 1800,
  });
}

/**
 * Roles this app understands. Anything else is treated as least privilege.
 */
const KNOWN_ROLES: ReadonlySet<string> = new Set(['admin', 'merchant']);

/** Least-privilege default when the backend has not confirmed a role. */
const FALLBACK_ROLE = 'merchant';

function normalizeRole(role: unknown): string {
  return typeof role === 'string' && KNOWN_ROLES.has(role) ? role : FALLBACK_ROLE;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;

    // The role is deliberately NOT read from the request body. It used to be,
    // which meant a caller could mint a `user_role=admin` cookie simply by
    // asking for one — the middleware trusts that cookie for route access.
    // The backend is the only thing allowed to say what a token is worth.
    let role = FALLBACK_ROLE;
    let confirmedByBackend = false;
    let revokedSessionCount: number | undefined;

    const upstreamBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Guard: if the upstream URL points back at this very Next.js server
    // (localhost:3000) skip the upstream call — it would loop back to this
    // same handler. Fall through to the mock/local path below.
    const isSelfLoop =
      upstreamBase.includes('localhost:3000') || upstreamBase.includes('127.0.0.1:3000');

    if (!isSelfLoop) {
      try {
        const upstreamResponse = await fetch(
          `${upstreamBase}/api/auth/session`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            cache: 'no-store',
          },
        );

        if (upstreamResponse.ok) {
          const upstreamBody = (await upstreamResponse.json()) as {
            revokedSessionCount?: unknown;
            role?: unknown;
            user?: { role?: unknown };
          };
          if (typeof upstreamBody.revokedSessionCount === 'number') {
            revokedSessionCount = upstreamBody.revokedSessionCount;
          }
          role = normalizeRole(upstreamBody.role ?? upstreamBody.user?.role);
          confirmedByBackend = true;
        } else if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
          // The backend rejected the token outright — do not set any cookie.
          return NextResponse.json(
            { ok: false, error: 'Invalid session token' },
            { status: 401 },
          );
        }
      } catch {
        // Local cookie setup remains available when the auth service is offline,
        // but the session is capped at the least-privilege role.
      }
    } else {
      // Local / mock mode: decode the role directly from the token payload
      // without verifying the signature (client already did structural checks).
      try {
        const payloadB64 = token.split('.')[1];
        if (payloadB64) {
          const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          role = normalizeRole(decoded.role);
        }
      } catch {
        // keep FALLBACK_ROLE
      }
      confirmedByBackend = false;
    }


    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';

    // Rotate the CSRF token on every login — this is the primary token rotation
    // point (issue #486). A fresh token is tied to the new authenticated
    // session, and the HttpOnly `csrf_sid` binding cookie ties it to *this*
    // session's auth token so a token from a previous visitor / a pre-login
    // page on the same browser profile can't be replayed.
    const csrfToken = generateCsrfToken();
    const csrfBinding = deriveCsrfBinding(csrfToken, sessionKeyFromAuthToken(token));

    const res = NextResponse.json({ ok: true, revokedSessionCount, role, confirmedByBackend });

    // auth_token: HttpOnly so JS cannot read it (XSS protection)
    res.headers.set(
      'Set-Cookie',
      `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // user_role: non-HttpOnly so middleware / server-side can read it
    res.headers.append(
      'Set-Cookie',
      `user_role=${role}; Path=/; SameSite=Lax; Max-Age=86400${secureFlag}`
    );
    // csrf_token: non-HttpOnly (JS must read it), SameSite=Strict
    res.headers.append('Set-Cookie', buildCsrfCookieHeader(csrfToken));
    // csrf_sid: HttpOnly session binding (issue #486)
    res.headers.append('Set-Cookie', buildCsrfSidCookieHeader(csrfBinding));

    return res;
  } catch (error) {
    console.error('Failed to set session:', error);
    return NextResponse.json({ ok: false, error: 'Failed to set session' }, { status: 500 });
  }
}

export async function DELETE() {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';

  const res = NextResponse.json({ ok: true });
  // Expire all three cookies atomically on logout
  res.headers.set(
    'Set-Cookie',
    `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  res.headers.append(
    'Set-Cookie',
    `user_role=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  for (const header of buildCsrfClearCookieHeaders()) {
    res.headers.append('Set-Cookie', header);
  }
  res.headers.append(
    'Set-Cookie',
    `merchant_onboarded=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`
  );
  return res;
}
