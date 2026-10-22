import { NextResponse } from 'next/server';
import { guardAdminApi } from '@/lib/auth/adminApiGuard';
import { verifyCsrfRequest } from '@/lib/utils/csrf';

/** Forward privileged operations to the persistent backend; never invent local data. */
export async function adminProxy(req: Request, path: string, body?: unknown) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  if (req.method !== 'GET' && !(await verifyCsrfRequest(req)).ok) {
    return NextResponse.json({ error: 'Invalid CSRF token.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const target = new URL(`${base.replace(/\/$/, '')}${path}`);
  if (target.origin === new URL(req.url).origin) {
    return NextResponse.json({ error: 'Admin backend is not configured.' }, { status: 503 });
  }
  const headers = new Headers({ cookie: req.headers.get('cookie') || '', 'Content-Type': 'application/json' });
  const csrf = req.headers.get('X-CSRF-Token');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  try {
    const response = await fetch(target, {
      method: req.method, headers, cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(15000),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const responseHeaders = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Cache-Control': 'no-store',
    });
    for (const name of ['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    // The shared API client expects delta seconds; upstream may use an HTTP date.
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter && !/^\d+$/.test(retryAfter) && Number.isFinite(Date.parse(retryAfter))) {
      responseHeaders.set('Retry-After', String(Math.max(1, Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000))));
    }
    return new NextResponse(response.status === 204 ? null : await response.text(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ error: 'Admin service unavailable. Please try again.' }, { status: 502 });
  }
}
