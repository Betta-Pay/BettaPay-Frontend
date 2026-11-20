import {
  CSRF_COOKIE_NAME,
  CSRF_TOKEN_HEX_LENGTH,
  deriveCsrfBinding,
  generateCsrfToken,
  rotateCsrfToken,
  sessionKeyFromAuthToken,
} from '../csrf';

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn().mockReturnValue(undefined),
  }),
}));

describe('CSRF token utilities', () => {
  it('generates a token of the correct hex length', () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(CSRF_TOKEN_HEX_LENGTH);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('sessionKeyFromAuthToken returns anon for empty values', () => {
    expect(sessionKeyFromAuthToken(null)).toBe('anon');
    expect(sessionKeyFromAuthToken(undefined)).toBe('anon');
    expect(sessionKeyFromAuthToken('')).toBe('anon');
  });

  it('sessionKeyFromAuthToken slices first 24 chars', () => {
    const token = 'a'.repeat(64);
    expect(sessionKeyFromAuthToken(token)).toBe('a'.repeat(24));
  });

  it('deriveCsrfBinding produces a valid hex digest', () => {
    const binding = deriveCsrfBinding('token123', 'session123');
    expect(binding).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(binding)).toBe(true);
  });

  it('deriveCsrfBinding is deterministic', () => {
    const a = deriveCsrfBinding('tok', 'sess');
    const b = deriveCsrfBinding('tok', 'sess');
    expect(a).toBe(b);
  });

  it('deriveCsrfBinding differs for different inputs', () => {
    const a = deriveCsrfBinding('tok1', 'sess');
    const b = deriveCsrfBinding('tok2', 'sess');
    expect(a).not.toBe(b);
  });

  it('sends credentialed, uncached requests when rotating the CSRF token', async () => {
    const token = 'c'.repeat(CSRF_TOKEN_HEX_LENGTH);
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    document.cookie = `${CSRF_COOKIE_NAME}=${token}; Path=/`;

    try {
      await expect(rotateCsrfToken()).resolves.toBe(token);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/auth/csrf?rotate=1',
        expect.objectContaining({
          credentials: 'include',
          cache: 'no-store',
        }),
      );
    } finally {
      global.fetch = originalFetch;
      document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
    }
  });

  it('does not return a stale token when the rotation endpoint fails', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as typeof fetch;
    document.cookie = `${CSRF_COOKIE_NAME}=${'d'.repeat(CSRF_TOKEN_HEX_LENGTH)}; Path=/`;

    try {
      await expect(rotateCsrfToken()).resolves.toBeNull();
    } finally {
      global.fetch = originalFetch;
      document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
    }
  });
});
