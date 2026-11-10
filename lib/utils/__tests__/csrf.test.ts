import {
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_META_NAME,
  CSRF_TOKEN_HEX_LENGTH,
  deriveCsrfBinding,
  sessionKeyFromAuthToken,
  getCsrfToken,
  getCsrfTokenFromMeta,
  isMutatingMethod,
  csrfHeader,
  withCsrfHeaders,
  attachCsrfHeader,
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

  describe('mutating request CSRF header injection (#915)', () => {
    const validToken = 'a'.repeat(CSRF_TOKEN_HEX_LENGTH);

    beforeEach(() => {
      document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0`;
      document.head.innerHTML = '';
    });

    it('identifies mutating HTTP methods accurately', () => {
      expect(isMutatingMethod('POST')).toBe(true);
      expect(isMutatingMethod('put')).toBe(true);
      expect(isMutatingMethod('PATCH')).toBe(true);
      expect(isMutatingMethod('DELETE')).toBe(true);
      expect(isMutatingMethod('GET')).toBe(false);
      expect(isMutatingMethod('HEAD')).toBe(false);
      expect(isMutatingMethod(undefined)).toBe(false);
    });

    it('reads CSRF token from cookie or falls back to meta tag', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('name', CSRF_META_NAME);
      meta.setAttribute('content', validToken);
      document.head.appendChild(meta);

      expect(getCsrfTokenFromMeta()).toBe(validToken);
      expect(getCsrfToken()).toBe(validToken);
      expect(csrfHeader()).toEqual({ [CSRF_HEADER_NAME]: validToken });
    });

    it('attaches X-CSRF-Token header to POST, PUT, PATCH, and DELETE requests', () => {
      document.cookie = `${CSRF_COOKIE_NAME}=${validToken}`;

      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const config = attachCsrfHeader({ method, headers: {} as Record<string, string> });
        expect(config.headers?.[CSRF_HEADER_NAME]).toBe(validToken);
      }
    });

    it('does not attach X-CSRF-Token header to GET requests', () => {
      document.cookie = `${CSRF_COOKIE_NAME}=${validToken}`;

      const getConfig = attachCsrfHeader({ method: 'GET', headers: {} as Record<string, string> });
      expect(getConfig.headers?.[CSRF_HEADER_NAME]).toBeUndefined();

      const fetchInit = withCsrfHeaders({ method: 'GET' });
      expect(fetchInit.headers).toBeUndefined();
    });
  });
});
