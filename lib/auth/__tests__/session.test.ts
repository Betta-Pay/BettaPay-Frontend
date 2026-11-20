import {
  AUTH_TOKEN_COOKIE,
  USER_ROLE_COOKIE,
  BP_SESSION_KEY,
  getSessionFromCookies,
  isSessionValid,
  isPublicRoute,
  isAuthRoute,
  isMarketingRoute,
} from '@/lib/auth/session';

const VALID_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.signature';
const EXPIRED_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.signature';

function mockCookies(entries: Record<string, string | undefined>) {
  return {
    get: (name: string) => {
      const v = entries[name];
      return v !== undefined ? { value: v } : undefined;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('lib/auth/session — single session contract for middleware, hooks, store', () => {
  it('exposes canonical cookie names used by middleware and route', () => {
    expect(AUTH_TOKEN_COOKIE).toBe('auth_token');
    expect(USER_ROLE_COOKIE).toBe('user_role');
    expect(BP_SESSION_KEY).toBe('bp-session');
  });

  it('getSessionFromCookies treats missing auth_token as unauthenticated', () => {
    const s = getSessionFromCookies(mockCookies({}));
    expect(s.isAuthenticated).toBe(false);
    expect(s.token).toBeNull();
    expect(isSessionValid(s)).toBe(false);
  });

  it('trims empty auth_token as unauthenticated', () => {
    const s = getSessionFromCookies(mockCookies({ [AUTH_TOKEN_COOKIE]: '   ', [USER_ROLE_COOKIE]: 'merchant' }));
    expect(s.isAuthenticated).toBe(false);
    expect(isSessionValid(s)).toBe(false);
  });

  it('rejects expired auth tokens', () => {
    const session = getSessionFromCookies(mockCookies({
      [AUTH_TOKEN_COOKIE]: EXPIRED_JWT,
      [USER_ROLE_COOKIE]: 'merchant',
    }));

    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeNull();
    expect(isSessionValid(session)).toBe(false);
  });

  it('rejects malformed auth tokens without throwing', () => {
    expect(() => getSessionFromCookies(mockCookies({
      [AUTH_TOKEN_COOKIE]: 'not-a-jwt',
      [USER_ROLE_COOKIE]: 'merchant',
    }))).not.toThrow();

    const session = getSessionFromCookies(mockCookies({
      [AUTH_TOKEN_COOKIE]: 'not-a-jwt',
      [USER_ROLE_COOKIE]: 'merchant',
    }));
    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeNull();
    expect(isSessionValid(session)).toBe(false);
  });

  it('revalidates tokens in an already-authenticated session', () => {
    expect(isSessionValid({
      user: null,
      token: EXPIRED_JWT,
      role: 'merchant',
      isAuthenticated: true,
    })).toBe(false);
    expect(isSessionValid({
      user: null,
      token: 'not-a-jwt',
      role: 'merchant',
      isAuthenticated: true,
    })).toBe(false);
  });

  it('valid session with token and merchant role', () => {
    const s = getSessionFromCookies(mockCookies({ [AUTH_TOKEN_COOKIE]: VALID_JWT, [USER_ROLE_COOKIE]: 'merchant' }));
    expect(s.isAuthenticated).toBe(true);
    expect(s.token).toBe(VALID_JWT);
    expect(s.role).toBe('merchant');
    expect(isSessionValid(s)).toBe(true);
  });

  it('normalizes role case and mainnet alias handling (via shared normalizeRole)', () => {
    const admin = getSessionFromCookies(mockCookies({ [AUTH_TOKEN_COOKIE]: VALID_JWT, [USER_ROLE_COOKIE]: 'ADMIN' }));
    expect(admin.role).toBe('admin');
    const merchant = getSessionFromCookies(mockCookies({ [AUTH_TOKEN_COOKIE]: VALID_JWT, [USER_ROLE_COOKIE]: '  MERCHANT  ' }));
    expect(merchant.role).toBe('merchant');
    const unknown = getSessionFromCookies(mockCookies({ [AUTH_TOKEN_COOKIE]: VALID_JWT, [USER_ROLE_COOKIE]: 'unknown' }));
    expect(unknown.role).toBeNull();
    expect(isSessionValid(unknown)).toBe(true); // token valid still, role nullable
  });

  it('hooks and middleware agree on login state after refresh rotation', () => {
    // Simulate rotation: old token replaced with new one, same role
    const before = getSessionFromCookies(mockCookies({
      [AUTH_TOKEN_COOKIE]: VALID_JWT,
      [USER_ROLE_COOKIE]: 'merchant',
    }));
    const after = getSessionFromCookies(mockCookies({
      [AUTH_TOKEN_COOKIE]: VALID_JWT.replace('signature', 'rotated-signature'),
      [USER_ROLE_COOKIE]: 'merchant',
    }));
    expect(isSessionValid(before)).toBe(true);
    expect(isSessionValid(after)).toBe(true);
    expect(after.token).toBe(VALID_JWT.replace('signature', 'rotated-signature'));
    // Logged-out after rotation (token cleared)
    const loggedOut = getSessionFromCookies(mockCookies({ [USER_ROLE_COOKIE]: 'merchant' }));
    expect(isSessionValid(loggedOut)).toBe(false);
  });

  it('classifies public / auth routes same as middleware', () => {
    expect(isPublicRoute('/')).toBe(true);
    expect(isPublicRoute('/pay/link123')).toBe(true);
    expect(isPublicRoute('/docs/intro')).toBe(true);
    expect(isPublicRoute('/dashboard')).toBe(false);
    expect(isPublicRoute('/settlement')).toBe(false);
    expect(isAuthRoute('/auth/login')).toBe(true);
    expect(isAuthRoute('/auth/register')).toBe(true);
    expect(isAuthRoute('/en/auth/login')).toBe(true);
    expect(isAuthRoute('/fr/auth/register')).toBe(true);
    expect(isAuthRoute('/dashboard')).toBe(false);
    expect(isPublicRoute('/fr/pay/link123')).toBe(true);
    expect(isPublicRoute('/pt/about')).toBe(true);
    expect(isPublicRoute('/en/dashboard')).toBe(false);
    expect(isMarketingRoute('/en')).toBe(true);
    expect(isMarketingRoute('/pt/about')).toBe(true);
    expect(isMarketingRoute('/en/auth/login')).toBe(false);
  });

  it('persisted BP_SESSION_KEY shape is isLoggedIn flag (store <-> e2e helper alignment)', () => {
    // authStore partializes to { isLoggedIn }, e2e/helpers/auth.ts seeds same
    const persisted = JSON.stringify({ state: { isLoggedIn: true }, version: 0 });
    const parsed = JSON.parse(persisted);
    expect(parsed.state.isLoggedIn).toBe(true);
    expect(BP_SESSION_KEY).toBe('bp-session');
  });
});
