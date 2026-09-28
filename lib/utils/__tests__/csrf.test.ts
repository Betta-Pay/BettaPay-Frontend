import { generateCsrfToken, CSRF_TOKEN_HEX_LENGTH, deriveCsrfBinding, sessionKeyFromAuthToken } from '../csrf';

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
});
