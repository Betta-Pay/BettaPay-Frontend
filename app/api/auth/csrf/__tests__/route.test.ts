import { NextRequest } from 'next/server';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_SID_COOKIE_NAME,
  deriveCsrfBinding,
  sessionKeyFromAuthToken,
  verifyCsrfRequest,
} from '@/lib/utils/csrf';
import { GET } from '../route';

const mockCookieValues: Record<string, string | undefined> = {};

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) => {
      const value = mockCookieValues[name];
      return value === undefined ? undefined : { value };
    },
  })),
}));

function getSetCookieValue(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|,\\s*)${name}=([^;,\\s]+)`));
  return match?.[1] ?? null;
}

describe('GET /api/auth/csrf', () => {
  beforeEach(() => {
    Object.keys(mockCookieValues).forEach((name) => delete mockCookieValues[name]);
  });

  it('rebinds a reused token to the active auth token and prevents caching', async () => {
    const token = 'a'.repeat(64);
    const authToken = 'current-auth-session';
    mockCookieValues[CSRF_COOKIE_NAME] = token;
    mockCookieValues.auth_token = authToken;
    mockCookieValues[CSRF_SID_COOKIE_NAME] = deriveCsrfBinding(
      token,
      sessionKeyFromAuthToken('previous-auth-session'),
    );

    const response = await GET(new NextRequest('http://localhost/api/auth/csrf'));
    const setCookie = response.headers.get('set-cookie') ?? '';
    const issuedToken = getSetCookieValue(setCookie, CSRF_COOKIE_NAME);
    const issuedBinding = getSetCookieValue(setCookie, CSRF_SID_COOKIE_NAME);

    expect(response.headers.get('Cache-Control')).toMatch(/no-store/);
    expect(issuedToken).toBe(token);
    expect(issuedBinding).toBe(
      deriveCsrfBinding(token, sessionKeyFromAuthToken(authToken)),
    );

    mockCookieValues[CSRF_COOKIE_NAME] = issuedToken!;
    mockCookieValues[CSRF_SID_COOKIE_NAME] = issuedBinding!;
    await expect(
      verifyCsrfRequest({
        headers: new Headers({ [CSRF_HEADER_NAME]: issuedToken! }),
      }),
    ).resolves.toEqual({ ok: true });
  });

  it('binds a rotated token to the current auth token', async () => {
    const authToken = 'rotated-auth-session';
    mockCookieValues[CSRF_COOKIE_NAME] = 'b'.repeat(64);
    mockCookieValues.auth_token = authToken;

    const response = await GET(
      new NextRequest('http://localhost/api/auth/csrf?rotate=1'),
    );
    const setCookie = response.headers.get('set-cookie') ?? '';
    const issuedToken = getSetCookieValue(setCookie, CSRF_COOKIE_NAME);
    const issuedBinding = getSetCookieValue(setCookie, CSRF_SID_COOKIE_NAME);

    expect(issuedToken).toMatch(/^[0-9a-f]{64}$/);
    expect(issuedToken).not.toBe(mockCookieValues[CSRF_COOKIE_NAME]);
    expect(issuedBinding).toBe(
      deriveCsrfBinding(issuedToken!, sessionKeyFromAuthToken(authToken)),
    );

    mockCookieValues[CSRF_COOKIE_NAME] = issuedToken!;
    mockCookieValues[CSRF_SID_COOKIE_NAME] = issuedBinding!;
    await expect(
      verifyCsrfRequest({
        headers: new Headers({ [CSRF_HEADER_NAME]: issuedToken! }),
      }),
    ).resolves.toEqual({ ok: true });
  });
});
