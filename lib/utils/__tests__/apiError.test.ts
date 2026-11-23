import {
  isNetworkError,
  parseApiError,
  NETWORK_ERROR_CODE,
  NETWORK_ERROR_MESSAGE,
  REQUEST_TIMED_OUT_CODE,
} from '@/lib/utils/apiError';

/** Minimal Axios-error-shaped object; only the fields `isNetworkError` reads. */
const axiosError = (overrides: Record<string, unknown> = {}) => ({
  isAxiosError: true,
  ...overrides,
});

describe('utils/apiError', () => {
  describe('isNetworkError (issue #1159)', () => {
    it('returns true when the raw request carries status 0', () => {
      expect(
        isNetworkError(axiosError({ request: { status: 0 }, message: 'Network Error' })),
      ).toBe(true);
    });

    it('returns true when the response carries status 0', () => {
      expect(isNetworkError(axiosError({ response: { status: 0 } }))).toBe(true);
    });

    it('returns true for ERR_NETWORK with no response', () => {
      expect(isNetworkError(axiosError({ code: 'ERR_NETWORK' }))).toBe(true);
    });

    it('returns true for the generic "Network Error" message with no response', () => {
      expect(isNetworkError(axiosError({ message: 'Network Error' }))).toBe(true);
    });

    it('returns false for a normal server error response', () => {
      expect(isNetworkError(axiosError({ response: { status: 500 } }))).toBe(false);
    });

    it('returns false for a 4xx client error response', () => {
      expect(isNetworkError(axiosError({ response: { status: 404 } }))).toBe(false);
    });

    it('returns false for non-object and nullish inputs', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
      expect(isNetworkError('network error')).toBe(false);
      expect(isNetworkError(42)).toBe(false);
    });

    it('recognises a bare error object carrying ERR_NETWORK', () => {
      expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    });
  });

  describe('parseApiError network mapping', () => {
    it('maps a status-0 XHR failure to the offline message and code', () => {
      const parsed = parseApiError(
        axiosError({ request: { status: 0 }, code: 'ERR_NETWORK', message: 'Network Error' }),
      );

      expect(parsed.message).toBe(NETWORK_ERROR_MESSAGE);
      expect(parsed.code).toBe(NETWORK_ERROR_CODE);
      expect(parsed.status).toBe(0);
    });

    it('falls back to NETWORK_ERROR_CODE when the axios error carries no code', () => {
      const parsed = parseApiError(axiosError({ response: { status: 0 } }));

      expect(parsed.code).toBe(NETWORK_ERROR_CODE);
      expect(parsed.status).toBe(0);
    });

    it('still maps timeouts to the timeout code (unaffected by #1159)', () => {
      const parsed = parseApiError(axiosError({ code: REQUEST_TIMED_OUT_CODE }));

      expect(parsed.code).toBe(REQUEST_TIMED_OUT_CODE);
    });
  });
});
