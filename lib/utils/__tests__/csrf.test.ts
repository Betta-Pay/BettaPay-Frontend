/**
 * @jest-environment node
 */
import {
  generateCsrfToken,
  CSRF_TOKEN_HEX_LENGTH,
  deriveCsrfBinding,
  sessionKeyFromAuthToken,
  getCsrfTokenFromCookie,
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

  it('sessionKeyFromAuthToken produces SHA-256 hex digest for valid tokens', () => {
    const token = 'a'.repeat(64);
    const key = sessionKeyFromAuthToken(token);
    expect(key).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(key)).toBe(true);
  });

  it('sessionKeyFromAuthToken produces different outputs for two distinct JWTs with identical headers', () => {
    // Both JWTs share the identical RS256/HS256 header (first 36 base64url characters)
    const jwtHeader = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const jwt1 = `${jwtHeader}.eyJzdWIiOiIxMTExMTExMTEifQ.sig11111111111111111111111111111111`;
    const jwt2 = `${jwtHeader}.eyJzdWIiOiIyMjIyMjIyMjIifQ.sig22222222222222222222222222222222`;

    const key1 = sessionKeyFromAuthToken(jwt1);
    const key2 = sessionKeyFromAuthToken(jwt2);

    expect(key1).not.toBe(key2);
    expect(key1).toHaveLength(64);
    expect(key2).toHaveLength(64);
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

  describe('getCsrfTokenFromCookie', () => {
    let cookie = '';

    beforeEach(() => {
      cookie = '';
      // @ts-expect-error mock document in node environment
      global.document = {
        get cookie() {
          return cookie;
        },
        set cookie(value: string) {
          cookie = value;
        },
      };
    });

    afterEach(() => {
      // @ts-expect-error simulating non-browser environment
      delete global.document;
    });

    it('returns null when document is undefined', () => {
      // @ts-expect-error simulating non-browser environment
      delete global.document;
      expect(getCsrfTokenFromCookie()).toBeNull();
    });

    it('returns null when cookie is absent', () => {
      document.cookie = 'other_cookie=value';
      expect(getCsrfTokenFromCookie()).toBeNull();
    });

    it('returns null instead of throwing when given malformed URI-encoded cookie values', () => {
      document.cookie = 'csrf_token=%E0%A4%A; other_cookie=123';
      expect(() => getCsrfTokenFromCookie()).not.toThrow();
      expect(getCsrfTokenFromCookie()).toBeNull();
    });

    it('returns token when cookie value is a valid 64-char hex string', () => {
      const validToken = 'a'.repeat(64);
      document.cookie = `csrf_token=${validToken}; other=test`;
      expect(getCsrfTokenFromCookie()).toBe(validToken);
    });

    it('returns null when token length is not 64 hex characters', () => {
      document.cookie = 'csrf_token=short-token; other=test';
      expect(getCsrfTokenFromCookie()).toBeNull();
    });
  });
});
