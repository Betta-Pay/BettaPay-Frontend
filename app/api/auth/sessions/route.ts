import { NextRequest, NextResponse } from 'next/server';
import { API_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

function getApiUrl(): string {
  return API_URL || 'http://localhost:3001';
}

function upstreamHeaders(request: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  const authToken = request.cookies.get('auth_token')?.value;
  const csrfToken = request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie');

  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (cookieHeader) headers.Cookie = cookieHeader;

  return headers;
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/auth/sessions`, {
      headers: upstreamHeaders(request),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return NextResponse.json(
      { error: timedOut ? 'Session service timed out' : 'Session service unavailable' },
      { status: timedOut ? 504 : 503, headers: NO_STORE },
    );
  }
}
